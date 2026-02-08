import * as ImageManipulator from 'expo-image-manipulator';
import {
  optimizeImage,
  optimizeImages,
  estimateFileSizeReduction,
} from '../imageOptimization';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

describe('imageOptimization service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('optimizeImage', () => {
    it('should optimize image with default settings', async () => {
      const mockResult = {
        uri: 'file://optimized.jpg',
        width: 1920,
        height: 1080,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockResult);

      const result = await optimizeImage('file://original.jpg');

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [
          {
            resize: {
              width: 1920,
              height: 1920,
            },
          },
        ],
        {
          compress: 0.8,
          format: 'jpeg',
        }
      );

      expect(result).toBe('file://optimized.jpg');
    });

    it('should optimize image with custom settings', async () => {
      const mockResult = {
        uri: 'file://optimized.jpg',
        width: 1024,
        height: 768,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockResult);

      const result = await optimizeImage('file://original.jpg', {
        maxWidth: 1024,
        maxHeight: 768,
        quality: 0.9,
      });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [
          {
            resize: {
              width: 1024,
              height: 768,
            },
          },
        ],
        {
          compress: 0.9,
          format: 'jpeg',
        }
      );

      expect(result).toBe('file://optimized.jpg');
    });

    it('should handle optimization errors gracefully', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Manipulation failed')
      );

      await expect(optimizeImage('file://original.jpg')).rejects.toThrow(
        'Failed to optimize image. Please try again.'
      );
    });

    it('should use partial custom config with defaults', async () => {
      const mockResult = {
        uri: 'file://optimized.jpg',
        width: 800,
        height: 600,
      };

      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue(mockResult);

      await optimizeImage('file://original.jpg', {
        quality: 0.6,
        // maxWidth and maxHeight should use defaults
      });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledWith(
        'file://original.jpg',
        [
          {
            resize: {
              width: 1920, // default
              height: 1920, // default
            },
          },
        ],
        {
          compress: 0.6, // custom
          format: 'jpeg',
        }
      );
    });
  });

  describe('optimizeImages', () => {
    it('should optimize multiple images in parallel', async () => {
      const mockResults = [
        { uri: 'file://optimized1.jpg', width: 1920, height: 1080 },
        { uri: 'file://optimized2.jpg', width: 1920, height: 1080 },
        { uri: 'file://optimized3.jpg', width: 1920, height: 1080 },
      ];

      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const result = await optimizeImages([
        'file://original1.jpg',
        'file://original2.jpg',
        'file://original3.jpg',
      ]);

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(3);
      expect(result).toEqual([
        'file://optimized1.jpg',
        'file://optimized2.jpg',
        'file://optimized3.jpg',
      ]);
    });

    it('should handle empty array', async () => {
      const result = await optimizeImages([]);

      expect(ImageManipulator.manipulateAsync).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should optimize with custom config for all images', async () => {
      const mockResults = [
        { uri: 'file://optimized1.jpg', width: 800, height: 600 },
        { uri: 'file://optimized2.jpg', width: 800, height: 600 },
      ];

      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      await optimizeImages(['file://original1.jpg', 'file://original2.jpg'], {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.7,
      });

      expect(ImageManipulator.manipulateAsync).toHaveBeenCalledTimes(2);
      expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
        1,
        'file://original1.jpg',
        expect.any(Array),
        expect.objectContaining({ compress: 0.7 })
      );
      expect(ImageManipulator.manipulateAsync).toHaveBeenNthCalledWith(
        2,
        'file://original2.jpg',
        expect.any(Array),
        expect.objectContaining({ compress: 0.7 })
      );
    });

    it('should handle optimization errors for multiple images', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockRejectedValue(
        new Error('Manipulation failed')
      );

      await expect(
        optimizeImages(['file://original1.jpg', 'file://original2.jpg'])
      ).rejects.toThrow('Failed to optimize images. Please try again.');
    });

    it('should fail if any image optimization fails', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock)
        .mockResolvedValueOnce({ uri: 'file://optimized1.jpg', width: 1920, height: 1080 })
        .mockRejectedValueOnce(new Error('Manipulation failed'));

      await expect(
        optimizeImages(['file://original1.jpg', 'file://original2.jpg'])
      ).rejects.toThrow('Failed to optimize images. Please try again.');
    });
  });

  describe('estimateFileSizeReduction', () => {
    it('should estimate ~10% reduction for high quality (0.9+)', () => {
      expect(estimateFileSizeReduction(1.0)).toBe(0.1);
      expect(estimateFileSizeReduction(0.95)).toBe(0.1);
      expect(estimateFileSizeReduction(0.9)).toBe(0.1);
    });

    it('should estimate ~40% reduction for medium-high quality (0.7-0.89)', () => {
      expect(estimateFileSizeReduction(0.8)).toBe(0.4);
      expect(estimateFileSizeReduction(0.75)).toBe(0.4);
      expect(estimateFileSizeReduction(0.7)).toBe(0.4);
    });

    it('should estimate ~60% reduction for medium quality (0.5-0.69)', () => {
      expect(estimateFileSizeReduction(0.6)).toBe(0.6);
      expect(estimateFileSizeReduction(0.55)).toBe(0.6);
      expect(estimateFileSizeReduction(0.5)).toBe(0.6);
    });

    it('should estimate ~75% reduction for low quality (<0.5)', () => {
      expect(estimateFileSizeReduction(0.4)).toBe(0.75);
      expect(estimateFileSizeReduction(0.3)).toBe(0.75);
      expect(estimateFileSizeReduction(0.1)).toBe(0.75);
    });
  });
});
