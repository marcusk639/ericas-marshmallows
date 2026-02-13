import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  createMemory as createMemoryService,
  uploadMemoryPhoto,
  uploadMemoryVideo,
  getMemoriesByCouple,
} from '../services/memories';
import type { Memory, WithId } from '../../../shared/types';

/**
 * Hook to fetch and manage memories for a couple
 */
export const useMemories = (coupleId: string | null, limit: number = 50) => {
  const [memories, setMemories] = useState<WithId<Memory>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadMemories = useCallback(async () => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getMemoriesByCouple(coupleId, limit);
      setMemories(data);
    } catch (err) {
      console.error('Error loading memories:', err);
      setError(err instanceof Error ? err : new Error('Failed to load memories'));
    } finally {
      setLoading(false);
    }
  }, [coupleId, limit]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const refresh = useCallback(() => {
    return loadMemories();
  }, [loadMemories]);

  return {
    memories,
    loading,
    error,
    refresh,
  };
};

/**
 * Hook to create a new memory with photo upload support
 */
export const useCreateMemory = (coupleId: string | null, userId: string | null) => {
  const [creating, setCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const createMemory = useCallback(
    async (
      title: string,
      description: string,
      photoUris: string[],
      videoUris: string[],
      tags: string[],
      date: Date
    ): Promise<string> => {
      if (!coupleId || !userId) {
        throw new Error('User must be signed in to create memory');
      }

      try {
        setCreating(true);
        setError(null);
        setUploadProgress(0);

        const totalItems = photoUris.length + videoUris.length;
        let itemsUploaded = 0;

        // Upload photos if any
        const photoUrls: string[] = [];
        if (photoUris.length > 0) {
          for (let i = 0; i < photoUris.length; i++) {
            const uri = photoUris[i];
            const url = await uploadMemoryPhoto(coupleId, uri, (progress) => {
              // Calculate overall progress across all media
              const baseProgress = itemsUploaded / totalItems;
              const currentItemProgress = progress / totalItems;
              setUploadProgress(baseProgress + currentItemProgress);
            });
            photoUrls.push(url);
            itemsUploaded++;
            setUploadProgress(itemsUploaded / totalItems);
          }
        }

        // Upload videos if any
        const videoUrls: string[] = [];
        if (videoUris.length > 0) {
          for (let i = 0; i < videoUris.length; i++) {
            const uri = videoUris[i];
            const url = await uploadMemoryVideo(coupleId, uri, (progress) => {
              // Calculate overall progress across all media
              const baseProgress = itemsUploaded / totalItems;
              const currentItemProgress = progress / totalItems;
              setUploadProgress(baseProgress + currentItemProgress);
            });
            videoUrls.push(url);
            itemsUploaded++;
            setUploadProgress(itemsUploaded / totalItems);
          }
        }

        setUploadProgress(1); // Set to 100% when all uploads complete

        // Create the memory document
        const memoryId = await createMemoryService(
          coupleId,
          userId,
          title,
          description,
          photoUrls,
          videoUrls,
          tags,
          date
        );

        console.log('Memory created successfully:', memoryId);
        return memoryId;
      } catch (err) {
        console.error('Error creating memory:', err);
        const errorObj = err instanceof Error ? err : new Error('Failed to create memory');
        setError(errorObj);
        throw errorObj;
      } finally {
        setCreating(false);
      }
    },
    [coupleId, userId]
  );

  return {
    createMemory,
    creating,
    uploadProgress,
    error,
  };
};

/**
 * Hook to extract unique tags from a list of memories
 */
export const useMemoryTags = (memories: WithId<Memory>[]): string[] => {
  return useMemo(() => {
    const tagSet = new Set<string>();

    memories.forEach((memory) => {
      memory.tags.forEach((tag) => {
        tagSet.add(tag);
      });
    });

    return Array.from(tagSet).sort();
  }, [memories]);
};
