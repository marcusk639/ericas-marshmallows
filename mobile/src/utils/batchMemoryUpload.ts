/**
 * Batch Memory Upload Utility
 *
 * This utility scans a specific photo album and creates memories in bulk.
 * Useful for importing existing photos/videos from a dedicated couples album.
 */

import * as MediaLibrary from 'expo-media-library';
import { analyzePhotoWithClaude, analyzeVideoWithClaude } from '../services/claudeVision';
import {
  createMemory as createMemoryService,
  uploadMemoryPhoto,
  uploadMemoryVideo,
} from '../services/memories';

export interface BatchUploadProgress {
  total: number;
  processed: number;
  created: number;
  failed: number;
  currentItem: string;
  status: string;
}

export interface BatchUploadOptions {
  albumName: string;
  coupleId: string;
  userId: string;
  analyzeMedia?: boolean; // Whether to analyze for people/golden retriever
  onProgress?: (progress: BatchUploadProgress) => void;
  onError?: (error: Error, item: string) => void;
}

export interface BatchUploadResult {
  totalProcessed: number;
  memoriesCreated: number;
  errors: Array<{ item: string; error: string }>;
}

/**
 * Find album by name
 */
async function findAlbumByName(albumName: string): Promise<MediaLibrary.Album | null> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Photo library permission not granted');
    }

    const albums = await MediaLibrary.getAlbumsAsync();
    const album = albums.find(a => a.title.toLowerCase() === albumName.toLowerCase());

    return album || null;
  } catch (error) {
    console.error('Error finding album:', error);
    throw error;
  }
}

/**
 * Get all media from an album
 * Uses pagination to handle albums with more than 10,000 items
 */
async function getAlbumMedia(album: MediaLibrary.Album): Promise<MediaLibrary.Asset[]> {
  try {
    const allAssets: MediaLibrary.Asset[] = [];
    let hasMore = true;
    let after: string | undefined;

    // Paginate through all media (expo-media-library has a max of ~10k per request)
    while (hasMore) {
      const media = await MediaLibrary.getAssetsAsync({
        album: album,
        mediaType: ['photo', 'video'],
        sortBy: MediaLibrary.SortBy.creationTime,
        first: 1000, // Fetch in batches of 1000
        after: after,
      });

      allAssets.push(...media.assets);
      hasMore = media.hasNextPage;
      after = media.endCursor;

      // Safety limit to prevent infinite loops
      if (allAssets.length > 50000) {
        console.warn('Album has more than 50,000 items, stopping pagination');
        break;
      }
    }

    console.log(`Found ${allAssets.length} media items in album "${album.title}"`);
    return allAssets;
  } catch (error) {
    console.error('Error getting album media:', error);
    throw error;
  }
}

/**
 * Group media by date (same day = same memory)
 */
function groupMediaByDate(assets: MediaLibrary.Asset[]): Map<string, MediaLibrary.Asset[]> {
  const grouped = new Map<string, MediaLibrary.Asset[]>();

  for (const asset of assets) {
    const date = new Date(asset.creationTime);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(asset);
  }

  return grouped;
}

/**
 * Batch upload and create memories from a specific photo album
 */
export async function batchUploadFromAlbum(
  options: BatchUploadOptions
): Promise<BatchUploadResult> {
  const {
    albumName,
    coupleId,
    userId,
    analyzeMedia = false,
    onProgress,
    onError,
  } = options;

  const errors: Array<{ item: string; error: string }> = [];
  let memoriesCreated = 0;

  try {
    // Find the album
    const album = await findAlbumByName(albumName);
    if (!album) {
      throw new Error(`Album "${albumName}" not found`);
    }

    // Get all media from the album
    const allMedia = await getAlbumMedia(album);

    // Group by date
    const groupedByDate = groupMediaByDate(allMedia);
    const totalGroups = groupedByDate.size;
    let processedGroups = 0;

    // Process each date group
    for (const [dateKey, assets] of groupedByDate.entries()) {
      try {
        const date = new Date(dateKey);

        onProgress?.({
          total: totalGroups,
          processed: processedGroups,
          created: memoriesCreated,
          failed: errors.length,
          currentItem: dateKey,
          status: `Processing ${assets.length} items from ${dateKey}...`,
        });

        // Separate photos and videos
        const photos = assets.filter(a => a.mediaType === 'photo');
        const videos = assets.filter(a => a.mediaType === 'video');

        // Optionally analyze for relevance (people/golden retriever)
        let shouldInclude = true;
        if (analyzeMedia && (photos.length > 0 || videos.length > 0)) {
          const samplePhoto = photos[0];
          const sampleVideo = videos[0];

          if (samplePhoto) {
            const analysis = await analyzePhotoWithClaude(samplePhoto.uri);
            shouldInclude = analysis.hasPeople || analysis.hasGoldenRetriever;
          } else if (sampleVideo) {
            const analysis = await analyzeVideoWithClaude(sampleVideo.uri);
            shouldInclude = analysis.hasPeople || analysis.hasGoldenRetriever;
          }
        }

        if (!shouldInclude) {
          console.log(`Skipping ${dateKey} - no people or golden retriever detected`);
          processedGroups++;
          continue;
        }

        // Upload photos
        const photoUrls: string[] = [];
        for (const photo of photos) {
          try {
            const url = await uploadMemoryPhoto(coupleId, photo.uri);
            photoUrls.push(url);
          } catch (error) {
            console.error(`Error uploading photo:`, error);
            onError?.(
              error instanceof Error ? error : new Error('Upload failed'),
              photo.uri
            );
            errors.push({
              item: photo.uri,
              error: error instanceof Error ? error.message : 'Upload failed',
            });
          }
        }

        // Upload videos
        const videoUrls: string[] = [];
        for (const video of videos) {
          try {
            const url = await uploadMemoryVideo(coupleId, video.uri);
            videoUrls.push(url);
          } catch (error) {
            console.error(`Error uploading video:`, error);
            onError?.(
              error instanceof Error ? error : new Error('Upload failed'),
              video.uri
            );
            errors.push({
              item: video.uri,
              error: error instanceof Error ? error.message : 'Upload failed',
            });
          }
        }

        // Create memory if we have any media
        if (photoUrls.length > 0 || videoUrls.length > 0) {
          const title = `Memory from ${date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}`;
          const description = `${photos.length} photo${photos.length !== 1 ? 's' : ''}, ${videos.length} video${videos.length !== 1 ? 's' : ''}`;

          await createMemoryService(
            coupleId,
            userId,
            title,
            description,
            photoUrls,
            videoUrls,
            ['batch-import', albumName.toLowerCase().replace(/\s+/g, '-')],
            date
          );

          memoriesCreated++;
        }

        processedGroups++;

        onProgress?.({
          total: totalGroups,
          processed: processedGroups,
          created: memoriesCreated,
          failed: errors.length,
          currentItem: dateKey,
          status: `Created memory for ${dateKey}`,
        });

      } catch (error) {
        console.error(`Error processing date ${dateKey}:`, error);
        onError?.(
          error instanceof Error ? error : new Error('Processing failed'),
          dateKey
        );
        errors.push({
          item: dateKey,
          error: error instanceof Error ? error.message : 'Processing failed',
        });
        processedGroups++;
      }
    }

    return {
      totalProcessed: processedGroups,
      memoriesCreated,
      errors,
    };
  } catch (error) {
    console.error('Batch upload failed:', error);
    throw error;
  }
}

/**
 * Example usage:
 *
 * const result = await batchUploadFromAlbum({
 *   albumName: 'Us Together',
 *   coupleId: 'couple123',
 *   userId: 'user123',
 *   analyzeMedia: true,
 *   onProgress: (progress) => {
 *     console.log(`Progress: ${progress.processed}/${progress.total}`);
 *     console.log(`Status: ${progress.status}`);
 *   },
 *   onError: (error, item) => {
 *     console.error(`Error with ${item}:`, error.message);
 *   },
 * });
 *
 * console.log(`Created ${result.memoriesCreated} memories`);
 * console.log(`Errors: ${result.errors.length}`);
 */
