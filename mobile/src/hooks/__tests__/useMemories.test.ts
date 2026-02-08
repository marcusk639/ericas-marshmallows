import { renderHook, act } from '@testing-library/react-hooks';
import {
  useMemories,
  useCreateMemory,
  useMemoryTags,
} from '../useMemories';
import * as memoriesService from '../../services/memories';
import type { Memory, WithId } from '../../../../shared/types';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock the memories service
jest.mock('../../services/memories');

describe('useMemories hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useMemories', () => {
    it('should load memories on mount', async () => {
      const mockMemories: WithId<Memory>[] = [
        {
          id: 'memory1',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Beach Day',
          description: 'Fun at the beach',
          photoUrls: ['https://example.com/beach.jpg'],
          devicePhotoUris: [],
          tags: ['beach', 'summer'],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        },
        {
          id: 'memory2',
          coupleId: 'couple123',
          createdBy: 'user456',
          title: 'Movie Night',
          description: 'Great film',
          photoUrls: [],
          devicePhotoUris: [],
          tags: ['movies'],
          date: { seconds: 1234567880, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567880, nanoseconds: 0 },
        },
      ];

      jest.spyOn(memoriesService, 'getMemoriesByCouple').mockResolvedValue(mockMemories);

      const { result } = renderHook(() => useMemories('couple123'));

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.memories).toEqual(mockMemories);
      expect(result.current.error).toBeNull();
      expect(memoriesService.getMemoriesByCouple).toHaveBeenCalledWith('couple123', 50);
    });

    it('should handle when no memories exist', async () => {
      jest.spyOn(memoriesService, 'getMemoriesByCouple').mockResolvedValue([]);

      const { result } = renderHook(() => useMemories('couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.memories).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when loading memories', async () => {
      const error = new Error('Failed to load memories');
      jest.spyOn(memoriesService, 'getMemoriesByCouple').mockRejectedValue(error);

      const { result } = renderHook(() => useMemories('couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.memories).toEqual([]);
    });

    it('should not load memories when coupleId is null', () => {
      const { result } = renderHook(() => useMemories(null));

      expect(result.current.loading).toBe(false);
      expect(result.current.memories).toEqual([]);
      expect(memoriesService.getMemoriesByCouple).not.toHaveBeenCalled();
    });

    it('should refresh memories when refresh is called', async () => {
      const mockMemories: WithId<Memory>[] = [
        {
          id: 'memory1',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Test Memory',
          description: 'Test',
          photoUrls: [],
          devicePhotoUris: [],
          tags: [],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        },
      ];

      jest.spyOn(memoriesService, 'getMemoriesByCouple').mockResolvedValue(mockMemories);

      const { result } = renderHook(() => useMemories('couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(memoriesService.getMemoriesByCouple).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refresh();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(memoriesService.getMemoriesByCouple).toHaveBeenCalledTimes(2);
    });

    it('should support custom limit', async () => {
      jest.spyOn(memoriesService, 'getMemoriesByCouple').mockResolvedValue([]);

      const { result } = renderHook(() => useMemories('couple123', 20));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(memoriesService.getMemoriesByCouple).toHaveBeenCalledWith('couple123', 20);
    });
  });

  describe('useCreateMemory', () => {
    it('should create a memory with photo upload', async () => {
      jest.spyOn(memoriesService, 'uploadMemoryPhoto').mockResolvedValue('https://example.com/photo.jpg');
      jest.spyOn(memoriesService, 'createMemory').mockResolvedValue('memory123');

      const { result } = renderHook(() => useCreateMemory('couple123', 'user123'));

      expect(result.current.creating).toBe(false);

      let memoryId: string | undefined;

      await act(async () => {
        memoryId = await result.current.createMemory(
          'Beach Day',
          'Fun at the beach',
          ['file:///photo1.jpg'],
          ['beach', 'summer'],
          new Date('2026-01-15')
        );
      });

      expect(memoryId).toBe('memory123');
      expect(result.current.creating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(memoriesService.uploadMemoryPhoto).toHaveBeenCalledWith(
        'couple123',
        'file:///photo1.jpg',
        expect.any(Function)
      );
      expect(memoriesService.createMemory).toHaveBeenCalledWith(
        'couple123',
        'user123',
        'Beach Day',
        'Fun at the beach',
        ['https://example.com/photo.jpg'],
        ['beach', 'summer'],
        new Date('2026-01-15')
      );
    });

    it('should create a memory without photos', async () => {
      jest.spyOn(memoriesService, 'createMemory').mockResolvedValue('memory124');

      const { result } = renderHook(() => useCreateMemory('couple123', 'user123'));

      let memoryId: string | undefined;

      await act(async () => {
        memoryId = await result.current.createMemory(
          'Quick Memory',
          'Just a note',
          [],
          [],
          new Date()
        );
      });

      expect(memoryId).toBe('memory124');
      expect(memoriesService.uploadMemoryPhoto).not.toHaveBeenCalled();
      expect(memoriesService.createMemory).toHaveBeenCalledWith(
        'couple123',
        'user123',
        'Quick Memory',
        'Just a note',
        [],
        [],
        expect.any(Date)
      );
    });

    it('should track upload progress', async () => {
      let capturedProgressCallback: ((progress: number) => void) | undefined;

      jest.spyOn(memoriesService, 'uploadMemoryPhoto').mockImplementation(
        async (coupleId, uri, onProgress) => {
          capturedProgressCallback = onProgress;
          // Simulate progress
          if (onProgress) {
            onProgress(0.5);
          }
          return 'https://example.com/photo.jpg';
        }
      );
      jest.spyOn(memoriesService, 'createMemory').mockResolvedValue('memory125');

      const { result } = renderHook(() => useCreateMemory('couple123', 'user123'));

      await act(async () => {
        await result.current.createMemory(
          'Test',
          '',
          ['file:///photo.jpg'],
          [],
          new Date()
        );
      });

      expect(result.current.uploadProgress).toBe(1); // After upload completes
    });

    it('should show loading state while creating', async () => {
      jest.spyOn(memoriesService, 'createMemory').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('memory126'), 100))
      );

      const { result } = renderHook(() => useCreateMemory('couple123', 'user123'));

      expect(result.current.creating).toBe(false);

      act(() => {
        result.current.createMemory('Test', '', [], [], new Date());
      });

      expect(result.current.creating).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.creating).toBe(false);
    });

    it('should handle errors when creating memory', async () => {
      const error = new Error('Failed to create memory');
      jest.spyOn(memoriesService, 'createMemory').mockRejectedValue(error);

      const { result } = renderHook(() => useCreateMemory('couple123', 'user123'));

      await act(async () => {
        try {
          await result.current.createMemory('Test', '', [], [], new Date());
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.creating).toBe(false);
    });

    it('should handle photo upload errors', async () => {
      const error = new Error('Upload failed');
      jest.spyOn(memoriesService, 'uploadMemoryPhoto').mockRejectedValue(error);

      const { result } = renderHook(() => useCreateMemory('couple123', 'user123'));

      await act(async () => {
        try {
          await result.current.createMemory(
            'Test',
            '',
            ['file:///photo.jpg'],
            [],
            new Date()
          );
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.creating).toBe(false);
    });

    it('should throw error when coupleId or userId is null', async () => {
      const { result } = renderHook(() => useCreateMemory(null, null));

      await expect(async () => {
        await act(async () => {
          await result.current.createMemory('Test', '', [], [], new Date());
        });
      }).rejects.toThrow('User must be signed in to create memory');
    });
  });

  describe('useMemoryTags', () => {
    it('should extract unique tags from memories', () => {
      const mockMemories: WithId<Memory>[] = [
        {
          id: 'memory1',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory 1',
          description: '',
          photoUrls: [],
          devicePhotoUris: [],
          tags: ['beach', 'summer', 'vacation'],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        },
        {
          id: 'memory2',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory 2',
          description: '',
          photoUrls: [],
          devicePhotoUris: [],
          tags: ['beach', 'sunset'],
          date: { seconds: 1234567880, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567880, nanoseconds: 0 },
        },
        {
          id: 'memory3',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory 3',
          description: '',
          photoUrls: [],
          devicePhotoUris: [],
          tags: [],
          date: { seconds: 1234567870, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567870, nanoseconds: 0 },
        },
      ];

      const { result } = renderHook(() => useMemoryTags(mockMemories));

      expect(result.current).toEqual(['beach', 'summer', 'sunset', 'vacation']);
    });

    it('should return empty array when no memories exist', () => {
      const { result } = renderHook(() => useMemoryTags([]));

      expect(result.current).toEqual([]);
    });

    it('should handle memories without tags', () => {
      const mockMemories: WithId<Memory>[] = [
        {
          id: 'memory1',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory 1',
          description: '',
          photoUrls: [],
          devicePhotoUris: [],
          tags: [],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        },
      ];

      const { result } = renderHook(() => useMemoryTags(mockMemories));

      expect(result.current).toEqual([]);
    });

    it('should sort tags alphabetically', () => {
      const mockMemories: WithId<Memory>[] = [
        {
          id: 'memory1',
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory 1',
          description: '',
          photoUrls: [],
          devicePhotoUris: [],
          tags: ['zebra', 'apple', 'banana'],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        },
      ];

      const { result } = renderHook(() => useMemoryTags(mockMemories));

      expect(result.current).toEqual(['apple', 'banana', 'zebra']);
    });
  });
});
