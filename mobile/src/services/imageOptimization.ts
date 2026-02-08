import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Configuration for image optimization
 */
export interface ImageOptimizationConfig {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1, where 1 is highest quality
}

/**
 * Default configuration for image optimization
 * Balances quality and file size for mobile uploads
 */
const DEFAULT_CONFIG: Required<ImageOptimizationConfig> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8, // 80% quality is good balance
};

/**
 * Optimize an image for upload
 * - Resizes to max dimensions while maintaining aspect ratio
 * - Compresses to reduce file size
 * - Returns optimized image URI
 */
export async function optimizeImage(
  uri: string,
  config: ImageOptimizationConfig = {}
): Promise<string> {
  try {
    const { maxWidth, maxHeight, quality } = { ...DEFAULT_CONFIG, ...config };

    // Manipulate the image
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    console.log('Image optimized:', {
      original: uri,
      optimized: result.uri,
      width: result.width,
      height: result.height,
    });

    return result.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image. Please try again.');
  }
}

/**
 * Optimize multiple images in parallel
 * Returns array of optimized URIs in same order as input
 */
export async function optimizeImages(
  uris: string[],
  config: ImageOptimizationConfig = {}
): Promise<string[]> {
  try {
    const optimizedPromises = uris.map((uri) => optimizeImage(uri, config));
    return await Promise.all(optimizedPromises);
  } catch (error) {
    console.error('Error optimizing images:', error);
    throw new Error('Failed to optimize images. Please try again.');
  }
}

/**
 * Get estimated file size reduction from optimization
 * This is an approximation based on typical JPEG compression
 */
export function estimateFileSizeReduction(quality: number): number {
  // Rough estimates:
  // quality 1.0 = ~10% reduction (mostly just resize)
  // quality 0.8 = ~40% reduction
  // quality 0.6 = ~60% reduction
  // quality 0.4 = ~75% reduction

  if (quality >= 0.9) return 0.1;
  if (quality >= 0.7) return 0.4;
  if (quality >= 0.5) return 0.6;
  return 0.75;
}
