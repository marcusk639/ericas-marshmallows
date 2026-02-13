import * as MediaLibrary from 'expo-media-library';
import { Platform } from 'react-native';
import { analyzePhotoBatch } from './claudeVision';

export interface PhotoSuggestion {
  uri: string;
  id: string;
  creationTime: number;
  width: number;
  height: number;
  hasPeople?: boolean;
  hasGoldenRetriever?: boolean;
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Request permission to access photo library
 */
export async function requestPhotoLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Scan photo library for recent photos
 * @param limit Maximum number of photos to scan (default 100)
 */
export async function scanPhotoLibrary(limit: number = 100): Promise<MediaLibrary.Asset[]> {
  const hasPermission = await requestPhotoLibraryPermission();
  if (!hasPermission) {
    throw new Error('Photo library permission not granted');
  }

  // Get recent photos from the library
  const media = await MediaLibrary.getAssetsAsync({
    first: limit,
    mediaType: 'photo',
    sortBy: MediaLibrary.SortBy.creationTime,
  });

  return media.assets;
}

/**
 * Analyze a single photo (kept for backwards compatibility)
 */
export async function analyzePhoto(asset: MediaLibrary.Asset): Promise<PhotoSuggestion> {
  const suggestion: PhotoSuggestion = {
    uri: asset.uri,
    id: asset.id,
    creationTime: asset.creationTime,
    width: asset.width,
    height: asset.height,
    hasPeople: undefined,
    hasGoldenRetriever: undefined,
    description: undefined,
    confidence: undefined,
  };

  return suggestion;
}

/**
 * Scan and analyze photos from the library
 * Returns photos that might be good memory candidates
 * Uses Claude Vision API for real ML analysis
 */
export async function scanForMemorySuggestions(
  limit: number = 100,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<PhotoSuggestion[]> {
  // Get recent photos
  if (onProgress) onProgress(0, limit, 'Loading photos...');
  const assets = await scanPhotoLibrary(limit);

  // Get URIs for analysis
  const uris = assets.map(asset => asset.uri);

  // Analyze photos with Claude Vision
  if (onProgress) onProgress(0, assets.length, 'Analyzing photos...');

  const analysisResults = await analyzePhotoBatch(uris, (current, total) => {
    if (onProgress) {
      onProgress(current, total, `Analyzing photo ${current} of ${total}...`);
    }
  });

  // Combine assets with analysis results
  const suggestions: PhotoSuggestion[] = assets.map(asset => {
    const analysis = analysisResults.get(asset.uri);
    return {
      uri: asset.uri,
      id: asset.id,
      creationTime: asset.creationTime,
      width: asset.width,
      height: asset.height,
      hasPeople: analysis?.hasPeople,
      hasGoldenRetriever: analysis?.hasGoldenRetriever,
      description: analysis?.description,
      confidence: analysis?.confidence,
    };
  });

  // Filter to only include relevant photos (has people or golden retriever)
  const relevantSuggestions = suggestions.filter(
    s => s.hasPeople || s.hasGoldenRetriever
  );

  if (onProgress) {
    onProgress(
      assets.length,
      assets.length,
      `Found ${relevantSuggestions.length} relevant photos`
    );
  }

  return relevantSuggestions;
}

