/**
 * Tests for Claude Vision API service
 */

// Set API key BEFORE importing module (checked at module load time)
process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = 'test-api-key';

import { analyzePhotoWithClaude, analyzePhotoBatch } from '../claudeVision';

// Mock fetch globally
global.fetch = jest.fn();

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri: string) =>
    Promise.resolve({ uri: `optimized_${uri}` })
  ),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

// Mock expo-video-thumbnails
jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn((uri: string, options: any) =>
    Promise.resolve({ uri: `thumbnail_${uri}_${options.time}` })
  ),
}));

describe('claudeVision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePhotoWithClaude', () => {
    it('should return low confidence result when API key is not configured', async () => {
      // Temporarily remove API key
      const originalKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = '';

      // Need to re-import to get new env value
      jest.resetModules();
      const { analyzePhotoWithClaude: analyzeWithoutKey } = require('../claudeVision');

      const result = await analyzeWithoutKey('test-uri');

      expect(result).toEqual({
        hasPeople: false,
        hasGoldenRetriever: false,
        description: 'API key not configured',
        confidence: 'low',
      });

      // Restore API key
      process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY = originalKey;
    });

    it('should analyze photo successfully with valid response', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              hasPeople: true,
              hasGoldenRetriever: false,
              description: 'Two people at a park',
              confidence: 'high',
            }),
          },
        ],
      };

      // Mock FileReader for base64 conversion
      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: any) {
          this.onloadend?.();
        }),
        result: 'data:image/jpeg;base64,mockBase64Data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      // First call: fetch image for conversion
      // Second call: Claude API
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1024 * 1024 }), // 1MB
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const result = await analyzePhotoWithClaude('test-image-uri');

      expect(result).toEqual({
        hasPeople: true,
        hasGoldenRetriever: false,
        description: 'Two people at a park',
        confidence: 'high',
      });
    });

    it('should detect golden retriever correctly', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              hasPeople: false,
              hasGoldenRetriever: true,
              description: 'A golden retriever playing in the yard',
              confidence: 'high',
            }),
          },
        ],
      };

      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: any) {
          this.onloadend?.();
        }),
        result: 'data:image/jpeg;base64,mockBase64Data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      // First call: fetch image, Second call: Claude API
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1024 * 1024 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

      const result = await analyzePhotoWithClaude('dog-image-uri');

      expect(result.hasGoldenRetriever).toBe(true);
      expect(result.hasPeople).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: any) {
          this.onloadend?.();
        }),
        result: 'data:image/jpeg;base64,mockBase64Data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      // First call: fetch image, Second call: Claude API error
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1024 * 1024 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        });

      const result = await analyzePhotoWithClaude('test-uri');

      expect(result).toEqual({
        hasPeople: false,
        hasGoldenRetriever: false,
        description: 'Analysis failed',
        confidence: 'low',
      });
    });

    it('should reject images larger than 5MB', async () => {
      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: any) {
          this.onerror?.(new Error('Image too large'));
        }),
        result: 'data:image/jpeg;base64,mockBase64Data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      // Mock large image (6MB)
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: () => Promise.resolve({ size: 6 * 1024 * 1024 }),
      });

      const result = await analyzePhotoWithClaude('large-image-uri');

      expect(result).toEqual({
        hasPeople: false,
        hasGoldenRetriever: false,
        description: 'Analysis failed',
        confidence: 'low',
      });
    });
  });

  describe('analyzePhotoBatch', () => {
    it('should analyze multiple photos with progress tracking', async () => {
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              hasPeople: true,
              hasGoldenRetriever: false,
              description: 'Test photo',
              confidence: 'high',
            }),
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: any) {
          this.onloadend?.();
        }),
        result: 'data:image/jpeg;base64,mockBase64Data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      const onProgress = jest.fn();
      const uris = ['uri1', 'uri2', 'uri3'];

      const results = await analyzePhotoBatch(uris, onProgress);

      expect(results.size).toBe(3);
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenCalledWith(1, 3);
      expect(onProgress).toHaveBeenCalledWith(2, 3);
      expect(onProgress).toHaveBeenCalledWith(3, 3);
    });

    it('should handle individual photo failures in batch', async () => {
      const mockFileReader = {
        readAsDataURL: jest.fn(function (this: any) {
          this.onloadend?.();
        }),
        result: 'data:image/jpeg;base64,mockBase64Data',
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      // Mock batch: 2 photos = 4 fetch calls (image fetch + API call for each)
      // Photo 1: image fetch (success) + Claude API (success)
      // Photo 2: image fetch (success) + Claude API (failure)
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1024 * 1024 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [
              {
                text: JSON.stringify({
                  hasPeople: true,
                  hasGoldenRetriever: false,
                  description: 'Success',
                  confidence: 'high',
                }),
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          blob: () => Promise.resolve({ size: 1024 * 1024 }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error',
        });

      const uris = ['uri1', 'uri2'];
      const results = await analyzePhotoBatch(uris);

      expect(results.size).toBe(2);
      expect(results.get('uri1')?.description).toBe('Success');
      expect(results.get('uri2')?.description).toBe('Analysis failed');
    });
  });
});
