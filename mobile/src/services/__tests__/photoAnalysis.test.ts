/**
 * Tests for photo analysis service
 */

import * as MediaLibrary from 'expo-media-library';
import {
  requestPhotoLibraryPermission,
  scanPhotoLibrary,
  scanForMemorySuggestions,
} from '../photoAnalysis';
import { analyzePhotoBatch } from '../claudeVision';

// Mock expo-media-library
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(),
  getAssetsAsync: jest.fn(),
  SortBy: {
    creationTime: 'creationTime',
  },
}));

// Mock claudeVision
jest.mock('../claudeVision', () => ({
  analyzePhotoBatch: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

describe('photoAnalysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestPhotoLibraryPermission', () => {
    it('should return true when permission is granted', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      const result = await requestPhotoLibraryPermission();

      expect(result).toBe(true);
    });

    it('should return false when permission is denied', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      const result = await requestPhotoLibraryPermission();

      expect(result).toBe(false);
    });

    it('should return false on web platform', async () => {
      const Platform = require('react-native').Platform;
      Platform.OS = 'web';

      const result = await requestPhotoLibraryPermission();

      expect(result).toBe(false);

      // Reset to ios
      Platform.OS = 'ios';
    });
  });

  describe('scanPhotoLibrary', () => {
    it('should scan and return photos when permission is granted', async () => {
      const mockAssets = [
        {
          id: '1',
          uri: 'photo1.jpg',
          creationTime: Date.now(),
          width: 1920,
          height: 1080,
        },
        {
          id: '2',
          uri: 'photo2.jpg',
          creationTime: Date.now() - 1000,
          width: 1920,
          height: 1080,
        },
      ];

      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: mockAssets,
      });

      const result = await scanPhotoLibrary(100);

      expect(result).toEqual(mockAssets);
      expect(MediaLibrary.getAssetsAsync).toHaveBeenCalledWith({
        first: 100,
        mediaType: 'photo',
        sortBy: MediaLibrary.SortBy.creationTime,
      });
    });

    it('should throw error when permission is not granted', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'denied',
      });

      await expect(scanPhotoLibrary()).rejects.toThrow(
        'Photo library permission not granted'
      );
    });

    it('should respect custom limit parameter', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: [],
      });

      await scanPhotoLibrary(50);

      expect(MediaLibrary.getAssetsAsync).toHaveBeenCalledWith({
        first: 50,
        mediaType: 'photo',
        sortBy: MediaLibrary.SortBy.creationTime,
      });
    });
  });

  describe('scanForMemorySuggestions', () => {
    it('should scan and analyze photos, filtering relevant ones', async () => {
      const mockAssets = [
        {
          id: '1',
          uri: 'photo1.jpg',
          creationTime: Date.now(),
          width: 1920,
          height: 1080,
        },
        {
          id: '2',
          uri: 'photo2.jpg',
          creationTime: Date.now() - 1000,
          width: 1920,
          height: 1080,
        },
        {
          id: '3',
          uri: 'photo3.jpg',
          creationTime: Date.now() - 2000,
          width: 1920,
          height: 1080,
        },
      ];

      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: mockAssets,
      });

      const mockAnalysisResults = new Map([
        [
          'photo1.jpg',
          {
            hasPeople: true,
            hasGoldenRetriever: false,
            description: 'Two people at park',
            confidence: 'high' as const,
          },
        ],
        [
          'photo2.jpg',
          {
            hasPeople: false,
            hasGoldenRetriever: true,
            description: 'Golden retriever playing',
            confidence: 'high' as const,
          },
        ],
        [
          'photo3.jpg',
          {
            hasPeople: false,
            hasGoldenRetriever: false,
            description: 'Empty landscape',
            confidence: 'high' as const,
          },
        ],
      ]);

      (analyzePhotoBatch as jest.Mock).mockResolvedValueOnce(mockAnalysisResults);

      const onProgress = jest.fn();
      const result = await scanForMemorySuggestions(100, onProgress);

      // Should only return photos with people or golden retriever
      expect(result).toHaveLength(2);
      expect(result[0].uri).toBe('photo1.jpg');
      expect(result[0].hasPeople).toBe(true);
      expect(result[1].uri).toBe('photo2.jpg');
      expect(result[1].hasGoldenRetriever).toBe(true);

      // Should call progress callback
      expect(onProgress).toHaveBeenCalledWith(0, 100, 'Loading photos...');
      expect(onProgress).toHaveBeenCalledWith(
        3,
        3,
        'Found 2 relevant photos'
      );
    });

    it('should track progress during analysis', async () => {
      const mockAssets = [
        { id: '1', uri: 'photo1.jpg', creationTime: Date.now(), width: 1920, height: 1080 },
      ];

      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: mockAssets,
      });

      const mockAnalysisResults = new Map([
        [
          'photo1.jpg',
          {
            hasPeople: true,
            hasGoldenRetriever: false,
            description: 'People',
            confidence: 'high' as const,
          },
        ],
      ]);

      let progressCallback: any;
      (analyzePhotoBatch as jest.Mock).mockImplementation(
        (uris: string[], onProgress?: any) => {
          progressCallback = onProgress;
          if (onProgress) {
            onProgress(1, 1);
          }
          return Promise.resolve(mockAnalysisResults);
        }
      );

      const onProgress = jest.fn();
      await scanForMemorySuggestions(100, onProgress);

      expect(onProgress).toHaveBeenCalledWith(0, 100, 'Loading photos...');
      expect(onProgress).toHaveBeenCalledWith(0, 1, 'Analyzing photos...');
      expect(onProgress).toHaveBeenCalledWith(1, 1, 'Analyzing photo 1 of 1...');
    });

    it('should handle empty photo library', async () => {
      (MediaLibrary.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
        status: 'granted',
      });

      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: [],
      });

      (analyzePhotoBatch as jest.Mock).mockResolvedValueOnce(new Map());

      const result = await scanForMemorySuggestions(100);

      expect(result).toHaveLength(0);
    });
  });
});
