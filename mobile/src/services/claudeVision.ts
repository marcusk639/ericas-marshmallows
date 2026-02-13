/**
 * Claude Vision API service for analyzing photos
 * Uses Anthropic's Claude API with vision capabilities
 *
 * Optimizations:
 * - Resizes images to ~1.15MP (1092x1092px) for optimal performance
 * - Uses Claude Haiku 4.5 for best accuracy/cost balance
 * - Validates image format and size
 *
 * Cost: ~$0.10 per 50 photos analyzed (~$2 per 1,000 photos)
 */

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as VideoThumbnails from 'expo-video-thumbnails';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

// Optimal image dimensions for Claude Vision (1.15MP, ~1600 tokens)
const OPTIMAL_IMAGE_SIZE = 1092; // 1092x1092 px for 1:1 aspect ratio
const MAX_IMAGE_SIZE_MB = 5;

export interface PhotoAnalysisResult {
  hasPeople: boolean;
  hasGoldenRetriever: boolean;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Optimize image for Claude Vision API
 * - Resizes to optimal dimensions (1092x1092 or proportional)
 * - Converts to JPEG for better compression
 * - Reduces file size while maintaining quality
 */
async function optimizeImage(uri: string): Promise<string> {
  try {
    // Resize image to optimal dimensions
    // This prevents Claude from auto-resizing (which adds latency)
    const manipResult = await manipulateAsync(
      uri,
      [
        {
          resize: {
            width: OPTIMAL_IMAGE_SIZE,
            height: OPTIMAL_IMAGE_SIZE,
          },
        },
      ],
      {
        compress: 0.8, // Good quality while reducing file size
        format: SaveFormat.JPEG, // JPEG is more efficient than PNG
      }
    );

    return manipResult.uri;
  } catch (error) {
    console.error('Error optimizing image:', error);
    // If optimization fails, return original URI
    return uri;
  }
}

/**
 * Convert image URI to base64
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    // Check file size
    if (blob.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      throw new Error(`Image exceeds ${MAX_IMAGE_SIZE_MB}MB limit`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data:image/...;base64, prefix
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Analyze a photo using Claude's vision API
 * Uses Claude Haiku 4.5 for optimal accuracy and cost efficiency
 */
export async function analyzePhotoWithClaude(
  imageUri: string
): Promise<PhotoAnalysisResult> {
  if (!ANTHROPIC_API_KEY) {
    console.warn('No Anthropic API key provided, skipping ML analysis');
    return {
      hasPeople: false,
      hasGoldenRetriever: false,
      description: 'API key not configured',
      confidence: 'low',
    };
  }

  try {
    // Optimize image first (resize to 1092x1092, convert to JPEG)
    const optimizedUri = await optimizeImage(imageUri);

    // Convert optimized image to base64
    const base64Image = await imageUriToBase64(optimizedUri);

    // Call Claude API with Haiku model (cost-efficient)
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251201', // Haiku 4.5: Better accuracy, still very cost-efficient
        max_tokens: 200, // Reduced from 300 (we only need JSON output)
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Respond ONLY with valid JSON (no markdown):
{
  "hasPeople": true/false,
  "hasGoldenRetriever": true/false,
  "description": "brief scene description",
  "confidence": "high"/"medium"/"low"
}

Criteria:
- hasPeople: Any people visible (couples, individuals, groups)
- hasGoldenRetriever: ONLY true if you see a golden retriever dog (not other breeds)
- confidence: high=clear/obvious, medium=likely but not certain, low=ambiguous`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse the JSON response
    const result = JSON.parse(content) as PhotoAnalysisResult;
    return result;
  } catch (error) {
    console.error('Error analyzing photo with Claude:', error);
    return {
      hasPeople: false,
      hasGoldenRetriever: false,
      description: 'Analysis failed',
      confidence: 'low',
    };
  }
}

/**
 * Extract frames from a video for analysis
 * Returns URIs of extracted frames (beginning, middle, end)
 */
async function extractVideoFrames(videoUri: string): Promise<string[]> {
  try {
    const frames: string[] = [];

    // Extract 3 frames: at 1s, 5s, and 10s (or max 3 frames for shorter videos)
    // For videos shorter than 10s, we'll extract what we can
    const timePositions = [1000, 5000, 10000]; // milliseconds

    for (const time of timePositions) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time,
          quality: 0.8,
        });
        frames.push(uri);
      } catch (error) {
        // For shorter videos, some frames may fail - that's ok
        console.log(`Could not extract frame at ${time}ms (video may be shorter)`);
        // Continue with other frames
      }
    }

    // If no frames were extracted, try extracting just the first frame
    if (frames.length === 0) {
      try {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: 0,
          quality: 0.8,
        });
        frames.push(uri);
      } catch (error) {
        throw new Error('Failed to extract any frames from video');
      }
    }

    return frames;
  } catch (error) {
    console.error('Error extracting video frames:', error);
    throw error;
  }
}

/**
 * Analyze a video by extracting and analyzing key frames
 */
export async function analyzeVideoWithClaude(videoUri: string): Promise<PhotoAnalysisResult> {
  try {
    console.log('Extracting frames from video for analysis...');
    const frames = await extractVideoFrames(videoUri);

    // Analyze each frame and aggregate results
    const results: PhotoAnalysisResult[] = [];
    for (const frameUri of frames) {
      const result = await analyzePhotoWithClaude(frameUri);
      results.push(result);
    }

    // Aggregate results: if any frame has people or golden retriever, mark as true
    const hasPeople = results.some(r => r.hasPeople);
    const hasGoldenRetriever = results.some(r => r.hasGoldenRetriever);

    // Use the highest confidence result
    const confidences = results.map(r => r.confidence);
    const highestConfidence = confidences.includes('high')
      ? 'high'
      : confidences.includes('medium')
        ? 'medium'
        : 'low';

    // Combine descriptions
    const descriptions = results
      .map(r => r.description)
      .filter(d => d !== 'API key not configured' && d !== 'Analysis failed');
    const description = descriptions.length > 0
      ? `Video: ${descriptions[0]}`
      : 'Video analyzed';

    return {
      hasPeople,
      hasGoldenRetriever,
      description,
      confidence: highestConfidence,
    };
  } catch (error) {
    console.error('Error analyzing video:', error);
    return {
      hasPeople: false,
      hasGoldenRetriever: false,
      description: 'Video analysis failed',
      confidence: 'low',
    };
  }
}

/**
 * Batch analyze multiple photos
 * Processes photos with a delay to avoid rate limiting
 */
export async function analyzePhotoBatch(
  imageUris: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, PhotoAnalysisResult>> {
  const results = new Map<string, PhotoAnalysisResult>();

  for (let i = 0; i < imageUris.length; i++) {
    const uri = imageUris[i];

    try {
      const result = await analyzePhotoWithClaude(uri);
      results.set(uri, result);

      if (onProgress) {
        onProgress(i + 1, imageUris.length);
      }

      // Add a small delay to avoid rate limiting
      if (i < imageUris.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Error analyzing photo ${i}:`, error);
      results.set(uri, {
        hasPeople: false,
        hasGoldenRetriever: false,
        description: 'Analysis failed',
        confidence: 'low',
      });
    }
  }

  return results;
}
