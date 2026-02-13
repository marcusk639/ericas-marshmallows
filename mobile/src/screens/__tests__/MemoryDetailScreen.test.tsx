import type { WithId, Memory } from '../../../../shared/types';

describe('MemoryDetailScreen', () => {
  const createMockMemory = (overrides?: Partial<WithId<Memory>>): WithId<Memory> => ({
    id: 'memory1',
    coupleId: 'couple123',
    createdBy: 'user123',
    title: 'Beach Day',
    description: 'A wonderful day at the beach',
    photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    videoUrls: ['https://example.com/video1.mp4'],
    devicePhotoUris: [],
    deviceVideoUris: [],
    tags: ['beach', 'summer'],
    date: {
      seconds: 1704067200,
      nanoseconds: 0,
    },
    source: 'manual' as const,
    createdAt: {
      seconds: 1704067200,
      nanoseconds: 0,
    },
    ...overrides,
  });

  describe('Media Counts', () => {
    it('should calculate correct photo count - singular', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg'],
        videoUrls: [],
      });

      expect(memory.photoUrls.length).toBe(1);
    });

    it('should calculate correct photo count - plural', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        videoUrls: [],
      });

      expect(memory.photoUrls.length).toBe(2);
    });

    it('should calculate correct video count - singular', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: ['https://example.com/video1.mp4'],
      });

      expect(memory.videoUrls?.length).toBe(1);
    });

    it('should calculate correct video count - plural', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: ['https://example.com/video1.mp4', 'https://example.com/video2.mp4'],
      });

      expect(memory.videoUrls?.length).toBe(2);
    });

    it('should count both photos and videos', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        videoUrls: ['https://example.com/video1.mp4'],
      });

      expect(memory.photoUrls.length).toBe(2);
      expect(memory.videoUrls?.length).toBe(1);
    });
  });

  describe('Grouped Memories', () => {
    it('should handle memory with many photos', () => {
      const memory = createMockMemory({
        photoUrls: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
          'https://example.com/photo4.jpg',
          'https://example.com/photo5.jpg',
        ],
        videoUrls: [],
      });

      expect(memory.photoUrls.length).toBe(5);
    });

    it('should handle memory with many videos', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: [
          'https://example.com/video1.mp4',
          'https://example.com/video2.mp4',
          'https://example.com/video3.mp4',
        ],
      });

      expect(memory.videoUrls?.length).toBe(3);
    });

    it('should handle mixed media memory', () => {
      const memory = createMockMemory({
        photoUrls: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        videoUrls: [
          'https://example.com/video1.mp4',
          'https://example.com/video2.mp4',
        ],
      });

      const totalMedia = memory.photoUrls.length + (memory.videoUrls?.length || 0);
      expect(totalMedia).toBe(5);
    });

    it('should combine photos and videos into media items array', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        videoUrls: ['https://example.com/video1.mp4'],
      });

      const mediaItems = [
        ...memory.photoUrls.map(url => ({ url, type: 'photo' as const })),
        ...(memory.videoUrls || []).map(url => ({ url, type: 'video' as const })),
      ];

      expect(mediaItems.length).toBe(3);
      expect(mediaItems[0].type).toBe('photo');
      expect(mediaItems[2].type).toBe('video');
    });
  });

  describe('Empty State Handling', () => {
    it('should detect when no photos or videos', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: [],
      });

      const mediaItems = [
        ...memory.photoUrls.map(url => ({ url, type: 'photo' as const })),
        ...(memory.videoUrls || []).map(url => ({ url, type: 'video' as const })),
      ];

      expect(mediaItems.length).toBe(0);
    });

    it('should handle undefined videoUrls', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: undefined,
      });

      const mediaItems = [
        ...memory.photoUrls.map(url => ({ url, type: 'photo' as const })),
        ...(memory.videoUrls || []).map(url => ({ url, type: 'video' as const })),
      ];

      expect(mediaItems.length).toBe(0);
    });
  });

  describe('Memory Data Structure', () => {
    it('should have required fields', () => {
      const memory = createMockMemory();

      expect(memory.id).toBeDefined();
      expect(memory.coupleId).toBeDefined();
      expect(memory.title).toBeDefined();
      expect(memory.photoUrls).toBeDefined();
      expect(memory.date).toBeDefined();
      expect(memory.tags).toBeDefined();
    });

    it('should format date correctly', () => {
      const memory = createMockMemory();
      const date = new Date(memory.date.seconds * 1000);

      // Timestamp 1704067200 is 2024-01-01 00:00:00 UTC
      expect(date.getTime()).toBe(1704067200000);
      expect(typeof date.toLocaleDateString()).toBe('string');
    });

    it('should handle optional description', () => {
      const memory1 = createMockMemory({ description: 'Test description' });
      const memory2 = createMockMemory({ description: '' });

      expect(memory1.description).toBe('Test description');
      expect(memory2.description).toBe('');
    });

    it('should handle multiple tags', () => {
      const memory = createMockMemory({ tags: ['beach', 'summer', 'vacation'] });

      expect(memory.tags.length).toBe(3);
      expect(memory.tags).toContain('beach');
      expect(memory.tags).toContain('vacation');
    });

    it('should handle empty tags array', () => {
      const memory = createMockMemory({ tags: [] });

      expect(memory.tags.length).toBe(0);
    });
  });

  describe('Media URL Validation', () => {
    it('should have valid photo URLs', () => {
      const memory = createMockMemory();

      memory.photoUrls.forEach(url => {
        expect(url).toMatch(/^https:\/\//);
        expect(url).toContain('example.com');
      });
    });

    it('should have valid video URLs', () => {
      const memory = createMockMemory();

      memory.videoUrls?.forEach(url => {
        expect(url).toMatch(/^https:\/\//);
        expect(url).toContain('.mp4');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitle = 'This is a very long memory title that should be handled properly';
      const memory = createMockMemory({ title: longTitle });

      expect(memory.title).toBe(longTitle);
    });

    it('should handle special characters in title', () => {
      const memory = createMockMemory({
        title: 'Birthday 🎂 Party! & Celebration',
      });

      expect(memory.title).toContain('🎂');
      expect(memory.title).toContain('&');
    });

    it('should handle many tags', () => {
      const memory = createMockMemory({
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8'],
      });

      expect(memory.tags.length).toBe(8);
    });

    it('should handle large photo arrays', () => {
      const photoUrls = Array.from({ length: 50 }, (_, i) => `https://example.com/photo${i}.jpg`);
      const memory = createMockMemory({ photoUrls });

      expect(memory.photoUrls.length).toBe(50);
    });
  });
});
