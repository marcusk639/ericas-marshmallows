import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  createMemory,
  uploadMemoryPhoto,
  getMemoriesByCouple,
  getMemoriesByTag,
  getRandomMemory,
  updateMemory,
  deleteMemory,
} from '../memories';
import * as ImageManipulator from 'expo-image-manipulator';

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
  },
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    fromDate: jest.fn((date: Date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0,
    })),
  },
}));

// Mock Firebase Storage
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
  storage: {},
}));

describe('memories service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createMemory', () => {
    it('should create a memory with photos', async () => {
      const mockDocRef = { id: 'memory123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const coupleId = 'couple123';
      const userId = 'user123';
      const title = 'Our First Date';
      const description = 'Amazing night at the restaurant';
      const photoUrls = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];
      const tags = ['date', 'restaurant'];
      const date = new Date('2026-01-15');

      const result = await createMemory(
        coupleId,
        userId,
        title,
        description,
        photoUrls,
        [],
        tags,
        date
      );

      expect(result).toBe('memory123');

      const addDocCall = (addDoc as jest.Mock).mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        coupleId,
        createdBy: userId,
        title,
        description,
        photoUrls,
        tags,
        source: 'manual',
      });
      expect(addDocCall[1].date).toBeDefined();
      expect(addDocCall[1].createdAt).toBeDefined();
    });

    it('should create a memory without optional fields', async () => {
      const mockDocRef = { id: 'memory124' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const result = await createMemory(
        'couple123',
        'user123',
        'Quick Memory',
        '',
        [],
        [],
        [],
        new Date()
      );

      expect(result).toBe('memory124');

      const addDocCall = (addDoc as jest.Mock).mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        title: 'Quick Memory',
        description: '',
        photoUrls: [],
        tags: [],
      });
    });

    it('should throw an error when creation fails', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        createMemory('couple123', 'user123', 'Test', '', [], [], [], new Date())
      ).rejects.toThrow('Failed to create memory. Please try again.');
    });
  });

  describe('uploadMemoryPhoto', () => {
    it('should upload photo to Firebase Storage and return URL', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///optimized/photo.jpg',
        width: 1920,
        height: 1080,
      });

      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      });

      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          onComplete();
        }),
        snapshot: {
          ref: 'mockRef',
        },
      };

      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
      (getDownloadURL as jest.Mock).mockResolvedValue('https://storage.example.com/photo.jpg');
      (ref as jest.Mock).mockReturnValue('mockStorageRef');

      const uri = 'file:///path/to/photo.jpg';
      const coupleId = 'couple123';

      const result = await uploadMemoryPhoto(coupleId, uri);

      expect(result).toBe('https://storage.example.com/photo.jpg');
      expect(ref).toHaveBeenCalled();
      expect(uploadBytesResumable).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalledWith('mockRef');
    });

    it('should handle upload progress callback', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///optimized/photo.jpg',
        width: 1920,
        height: 1080,
      });

      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      });

      const progressCallback = jest.fn();
      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError, onComplete) => {
          // Simulate progress
          onProgress({ bytesTransferred: 50, totalBytes: 100 });
          onComplete();
        }),
        snapshot: {
          ref: 'mockRef',
        },
      };

      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
      (getDownloadURL as jest.Mock).mockResolvedValue('https://storage.example.com/photo.jpg');
      (ref as jest.Mock).mockReturnValue('mockStorageRef');

      const result = await uploadMemoryPhoto('couple123', 'file:///photo.jpg', progressCallback);

      expect(result).toBe('https://storage.example.com/photo.jpg');
      expect(progressCallback).toHaveBeenCalledWith(0.5);
    });

    it('should throw an error when upload fails', async () => {
      (ImageManipulator.manipulateAsync as jest.Mock).mockResolvedValue({
        uri: 'file:///optimized/photo.jpg',
        width: 1920,
        height: 1080,
      });

      const mockBlob = new Blob(['fake image data'], { type: 'image/jpeg' });
      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(mockBlob),
      });

      const mockUploadTask = {
        on: jest.fn((event, onProgress, onError) => {
          onError(new Error('Upload failed'));
        }),
      };

      (uploadBytesResumable as jest.Mock).mockReturnValue(mockUploadTask);
      (ref as jest.Mock).mockReturnValue('mockStorageRef');

      await expect(
        uploadMemoryPhoto('couple123', 'file:///photo.jpg')
      ).rejects.toThrow('Failed to upload photo. Please try again.');
    });
  });

  describe('getMemoriesByCouple', () => {
    it('should retrieve all memories for couple', async () => {
      const mockMemories = [
        {
          id: 'memory1',
          data: () => ({
            coupleId: 'couple123',
            createdBy: 'user123',
            title: 'Beach Day',
            description: 'Fun at the beach',
            photoUrls: ['https://example.com/beach.jpg'],
            tags: ['beach', 'summer'],
            date: { seconds: 1234567890, nanoseconds: 0 },
            source: 'manual',
            createdAt: { seconds: 1234567890, nanoseconds: 0 },
          }),
        },
        {
          id: 'memory2',
          data: () => ({
            coupleId: 'couple123',
            createdBy: 'user456',
            title: 'Movie Night',
            description: 'Watched a great film',
            photoUrls: [],
            tags: ['movies'],
            date: { seconds: 1234567880, nanoseconds: 0 },
            source: 'manual',
            createdAt: { seconds: 1234567880, nanoseconds: 0 },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockMemories,
        empty: false,
      });

      const result = await getMemoriesByCouple('couple123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'memory1',
        coupleId: 'couple123',
        createdBy: 'user123',
        title: 'Beach Day',
        description: 'Fun at the beach',
        photoUrls: ['https://example.com/beach.jpg'],
        videoUrls: [],
        devicePhotoUris: [],
        deviceVideoUris: [],
        tags: ['beach', 'summer'],
        date: { seconds: 1234567890, nanoseconds: 0 },
        source: 'manual',
        createdAt: { seconds: 1234567890, nanoseconds: 0 },
      });
      expect(orderBy).toHaveBeenCalledWith('date', 'desc');
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 50 when not specified', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      await getMemoriesByCouple('couple123');

      expect(limit).toHaveBeenCalledWith(50);
    });

    it('should return empty array when no memories exist', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getMemoriesByCouple('couple123');

      expect(result).toEqual([]);
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getMemoriesByCouple('couple123')).rejects.toThrow(
        'Failed to get memories. Please try again.'
      );
    });
  });

  describe('getMemoriesByTag', () => {
    it('should filter memories by tag', async () => {
      const mockMemories = [
        {
          id: 'memory1',
          data: () => ({
            coupleId: 'couple123',
            createdBy: 'user123',
            title: 'Beach Day',
            description: 'Fun at the beach',
            photoUrls: ['https://example.com/beach.jpg'],
            tags: ['beach', 'summer'],
            date: { seconds: 1234567890, nanoseconds: 0 },
            source: 'manual',
            createdAt: { seconds: 1234567890, nanoseconds: 0 },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockMemories,
        empty: false,
      });

      const result = await getMemoriesByTag('couple123', 'beach');

      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('beach');
      expect(where).toHaveBeenCalledWith('coupleId', '==', 'couple123');
      expect(where).toHaveBeenCalledWith('tags', 'array-contains', 'beach');
    });

    it('should return empty array when no memories match tag', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getMemoriesByTag('couple123', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getMemoriesByTag('couple123', 'beach')).rejects.toThrow(
        'Failed to get memories by tag. Please try again.'
      );
    });
  });

  describe('getRandomMemory', () => {
    it('should return a random memory from collection', async () => {
      const mockMemories = [
        {
          id: 'memory1',
          data: () => ({
            coupleId: 'couple123',
            createdBy: 'user123',
            title: 'Memory 1',
            description: 'First memory',
            photoUrls: [],
            tags: [],
            date: { seconds: 1234567890, nanoseconds: 0 },
            source: 'manual',
            createdAt: { seconds: 1234567890, nanoseconds: 0 },
          }),
        },
        {
          id: 'memory2',
          data: () => ({
            coupleId: 'couple123',
            createdBy: 'user123',
            title: 'Memory 2',
            description: 'Second memory',
            photoUrls: [],
            tags: [],
            date: { seconds: 1234567880, nanoseconds: 0 },
            source: 'manual',
            createdAt: { seconds: 1234567880, nanoseconds: 0 },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockMemories,
        empty: false,
      });

      // Mock Math.random to return predictable value
      jest.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = await getRandomMemory('couple123');

      expect(result).toBeDefined();
      expect(result?.id).toMatch(/memory[12]/);
      expect(where).toHaveBeenCalledWith('coupleId', '==', 'couple123');
    });

    it('should return null when no memories exist', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getRandomMemory('couple123');

      expect(result).toBeNull();
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getRandomMemory('couple123')).rejects.toThrow(
        'Failed to get random memory. Please try again.'
      );
    });
  });

  describe('updateMemory', () => {
    it('should update memory title, description, and tags', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue('mockDocRef');

      const memoryId = 'memory123';
      const updates = {
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['new', 'tags'],
      };

      await updateMemory(memoryId, updates);

      expect(doc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith('mockDocRef', updates);
    });

    it('should update partial fields', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue('mockDocRef');

      const updates = { title: 'Just the title' };

      await updateMemory('memory123', updates);

      expect(updateDoc).toHaveBeenCalledWith('mockDocRef', updates);
    });

    it('should throw an error when update fails', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      (doc as jest.Mock).mockReturnValue('mockDocRef');

      await expect(updateMemory('memory123', { title: 'Test' })).rejects.toThrow(
        'Failed to update memory. Please try again.'
      );
    });
  });

  describe('deleteMemory', () => {
    it('should delete memory and cleanup photos', async () => {
      const mockMemory = {
        id: 'memory123',
        data: () => ({
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory to Delete',
          description: 'Will be deleted',
          photoUrls: [
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/couples%2Fcouple123%2Fmemories%2Fphoto1.jpg?alt=media',
            'https://firebasestorage.googleapis.com/v0/b/bucket/o/couples%2Fcouple123%2Fmemories%2Fphoto2.jpg?alt=media',
          ],
          tags: [],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        }),
      };

      (doc as jest.Mock).mockReturnValue('mockDocRef');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [mockMemory],
        empty: false,
      });
      (deleteObject as jest.Mock).mockResolvedValue(undefined);
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);
      (ref as jest.Mock).mockReturnValue('mockStorageRef');

      await deleteMemory('memory123');

      expect(deleteObject).toHaveBeenCalledTimes(2);
      expect(deleteDoc).toHaveBeenCalledWith('mockDocRef');
    });

    it('should delete memory without photos', async () => {
      const mockMemory = {
        id: 'memory124',
        data: () => ({
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory without photos',
          description: '',
          photoUrls: [],
          tags: [],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        }),
      };

      (doc as jest.Mock).mockReturnValue('mockDocRef');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [mockMemory],
        empty: false,
      });
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);

      await deleteMemory('memory124');

      expect(deleteObject).not.toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalledWith('mockDocRef');
    });

    it('should throw an error when memory not found', async () => {
      (doc as jest.Mock).mockReturnValue('mockDocRef');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      await expect(deleteMemory('nonexistent')).rejects.toThrow('Memory not found.');
    });

    it('should throw an error when deletion fails', async () => {
      const mockMemory = {
        id: 'memory123',
        data: () => ({
          coupleId: 'couple123',
          createdBy: 'user123',
          title: 'Memory',
          description: '',
          photoUrls: [],
          tags: [],
          date: { seconds: 1234567890, nanoseconds: 0 },
          source: 'manual',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        }),
      };

      (doc as jest.Mock).mockReturnValue('mockDocRef');
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [mockMemory],
        empty: false,
      });
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(deleteMemory('memory123')).rejects.toThrow(
        'Failed to delete memory. Please try again.'
      );
    });
  });
});
