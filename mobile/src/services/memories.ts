import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { optimizeImage } from './imageOptimization';
import type { Memory, WithId } from '../../../shared/types';

/**
 * Create a new memory
 */
export const createMemory = async (
  coupleId: string,
  userId: string,
  title: string,
  description: string,
  photoUrls: string[],
  videoUrls: string[] = [],
  tags: string[],
  date: Date
): Promise<string> => {
  try {
    const memoryData = {
      coupleId,
      createdBy: userId,
      title,
      description,
      photoUrls,
      videoUrls,
      devicePhotoUris: [],
      deviceVideoUris: [],
      tags,
      date: Timestamp.fromDate(date),
      source: 'manual' as const,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'memories'), memoryData);
    console.log('Successfully created memory:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating memory:', error);
    throw new Error('Failed to create memory. Please try again.');
  }
};

/**
 * Upload a photo to Firebase Storage for a memory
 * Optimizes the image before upload to reduce storage costs and improve performance
 */
export const uploadMemoryPhoto = async (
  coupleId: string,
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Optimize the image first to reduce file size
    console.log('Optimizing image before upload...');
    const optimizedUri = await optimizeImage(uri, {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
    });

    // Fetch the optimized image
    const response = await fetch(optimizedUri);
    const blob = await response.blob();

    console.log('Image optimized, uploading to storage...');

    // Create a unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `couples/${coupleId}/memories/${filename}`);

    // Upload with progress tracking
    return new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Error uploading photo:', error);
          reject(new Error('Failed to upload photo. Please try again.'));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Photo uploaded successfully:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(new Error('Failed to upload photo. Please try again.'));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw new Error('Failed to upload photo. Please try again.');
  }
};

/**
 * Upload a video to Firebase Storage for a memory
 */
export const uploadMemoryVideo = async (
  coupleId: string,
  uri: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    console.log('Uploading video to storage...');

    // Fetch the video
    const response = await fetch(uri);
    const blob = await response.blob();

    // Create a unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`;
    const storageRef = ref(storage, `couples/${coupleId}/memories/${filename}`);

    // Upload with progress tracking
    return new Promise<string>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.bytesTransferred / snapshot.totalBytes;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Error uploading video:', error);
          reject(new Error('Failed to upload video. Please try again.'));
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Video uploaded successfully:', downloadURL);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(new Error('Failed to upload video. Please try again.'));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    throw new Error('Failed to upload video. Please try again.');
  }
};

/**
 * Get all memories for a couple
 */
export const getMemoriesByCouple = async (
  coupleId: string,
  limit: number = 50
): Promise<WithId<Memory>[]> => {
  try {
    const q = query(
      collection(db, 'memories'),
      where('coupleId', '==', coupleId),
      orderBy('date', 'desc'),
      firestoreLimit(limit)
    );

    const snapshot = await getDocs(q);

    const memories: WithId<Memory>[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        coupleId: data.coupleId,
        createdBy: data.createdBy,
        title: data.title,
        description: data.description,
        photoUrls: data.photoUrls || [],
        videoUrls: data.videoUrls || [],
        devicePhotoUris: data.devicePhotoUris || [],
        deviceVideoUris: data.deviceVideoUris || [],
        tags: data.tags || [],
        date: data.date
          ? {
              seconds: (data.date as Timestamp).seconds,
              nanoseconds: (data.date as Timestamp).nanoseconds,
            }
          : { seconds: 0, nanoseconds: 0 },
        source: data.source,
        createdAt: data.createdAt
          ? {
              seconds: (data.createdAt as Timestamp).seconds,
              nanoseconds: (data.createdAt as Timestamp).nanoseconds,
            }
          : { seconds: 0, nanoseconds: 0 },
      };
    });

    console.log(`Successfully retrieved ${memories.length} memories`);
    return memories;
  } catch (error) {
    console.error('Error getting memories:', error);
    throw new Error('Failed to get memories. Please try again.');
  }
};

/**
 * Get memories filtered by tag
 */
export const getMemoriesByTag = async (
  coupleId: string,
  tag: string
): Promise<WithId<Memory>[]> => {
  try {
    const q = query(
      collection(db, 'memories'),
      where('coupleId', '==', coupleId),
      where('tags', 'array-contains', tag),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);

    const memories: WithId<Memory>[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        coupleId: data.coupleId,
        createdBy: data.createdBy,
        title: data.title,
        description: data.description,
        photoUrls: data.photoUrls || [],
        videoUrls: data.videoUrls || [],
        devicePhotoUris: data.devicePhotoUris || [],
        deviceVideoUris: data.deviceVideoUris || [],
        tags: data.tags || [],
        date: data.date
          ? {
              seconds: (data.date as Timestamp).seconds,
              nanoseconds: (data.date as Timestamp).nanoseconds,
            }
          : { seconds: 0, nanoseconds: 0 },
        source: data.source,
        createdAt: data.createdAt
          ? {
              seconds: (data.createdAt as Timestamp).seconds,
              nanoseconds: (data.createdAt as Timestamp).nanoseconds,
            }
          : { seconds: 0, nanoseconds: 0 },
      };
    });

    console.log(`Successfully retrieved ${memories.length} memories with tag: ${tag}`);
    return memories;
  } catch (error) {
    console.error('Error getting memories by tag:', error);
    throw new Error('Failed to get memories by tag. Please try again.');
  }
};

/**
 * Get a random memory from the collection
 */
export const getRandomMemory = async (
  coupleId: string
): Promise<WithId<Memory> | null> => {
  try {
    const q = query(
      collection(db, 'memories'),
      where('coupleId', '==', coupleId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const memories = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        coupleId: data.coupleId,
        createdBy: data.createdBy,
        title: data.title,
        description: data.description,
        photoUrls: data.photoUrls || [],
        videoUrls: data.videoUrls || [],
        devicePhotoUris: data.devicePhotoUris || [],
        deviceVideoUris: data.deviceVideoUris || [],
        tags: data.tags || [],
        date: data.date
          ? {
              seconds: (data.date as Timestamp).seconds,
              nanoseconds: (data.date as Timestamp).nanoseconds,
            }
          : { seconds: 0, nanoseconds: 0 },
        source: data.source,
        createdAt: data.createdAt
          ? {
              seconds: (data.createdAt as Timestamp).seconds,
              nanoseconds: (data.createdAt as Timestamp).nanoseconds,
            }
          : { seconds: 0, nanoseconds: 0 },
      };
    });

    const randomIndex = Math.floor(Math.random() * memories.length);
    console.log('Successfully retrieved random memory');
    return memories[randomIndex];
  } catch (error) {
    console.error('Error getting random memory:', error);
    throw new Error('Failed to get random memory. Please try again.');
  }
};

/**
 * Update a memory
 */
export const updateMemory = async (
  memoryId: string,
  updates: Partial<Pick<Memory, 'title' | 'description' | 'tags'>>
): Promise<void> => {
  try {
    const memoryRef = doc(db, 'memories', memoryId);
    await updateDoc(memoryRef, updates);
    console.log('Successfully updated memory:', memoryId);
  } catch (error) {
    console.error('Error updating memory:', error);
    throw new Error('Failed to update memory. Please try again.');
  }
};

/**
 * Delete a memory and cleanup associated photos and videos
 */
export const deleteMemory = async (memoryId: string): Promise<void> => {
  try {
    // First, get the memory to find media URLs
    const memoryRef = doc(db, 'memories', memoryId);
    const q = query(collection(db, 'memories'), where('__name__', '==', memoryId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Memory not found.');
    }

    const memoryData = snapshot.docs[0].data();
    const photoUrls = memoryData.photoUrls || [];
    const videoUrls = memoryData.videoUrls || [];
    const allMediaUrls = [...photoUrls, ...videoUrls];

    // Delete media from storage
    for (const mediaUrl of allMediaUrls) {
      try {
        // Extract the storage path from the URL
        if (mediaUrl.includes('firebase')) {
          const path = mediaUrl.split('/o/')[1]?.split('?')[0];
          if (path) {
            const decodedPath = decodeURIComponent(path);
            const mediaRef = ref(storage, decodedPath);
            await deleteObject(mediaRef);
            console.log('Deleted media from storage:', decodedPath);
          }
        }
      } catch (mediaError) {
        console.error('Error deleting media:', mediaError);
        // Continue with other media even if one fails
      }
    }

    // Delete the memory document
    await deleteDoc(memoryRef);
    console.log('Successfully deleted memory:', memoryId);
  } catch (error) {
    console.error('Error deleting memory:', error);
    if (error instanceof Error && error.message === 'Memory not found.') {
      throw error;
    }
    throw new Error('Failed to delete memory. Please try again.');
  }
};
