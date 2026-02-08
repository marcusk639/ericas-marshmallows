import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore';
import {
  sendMarshmallow,
  subscribeToCoupleMarshmallows,
  markMarshmallowAsRead,
} from '../marshmallows';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => 'mock-collection-ref'),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  updateDoc: jest.fn(),
  doc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('marshmallows service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMarshmallow', () => {
    it('should send a custom marshmallow with correct data', async () => {
      const mockDocRef = { id: 'marshmallow123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const coupleId = 'couple123';
      const senderId = 'user1';
      const recipientId = 'user2';
      const message = 'I love you!';
      const type = 'custom';

      const result = await sendMarshmallow(
        coupleId,
        senderId,
        recipientId,
        message,
        type
      );

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          coupleId,
          senderId,
          recipientId,
          message,
          type,
          read: false,
        })
      );
      expect(result).toBe('marshmallow123');
    });

    it('should send a quick-pick marshmallow with quickPickId', async () => {
      const mockDocRef = { id: 'marshmallow456' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const coupleId = 'couple123';
      const senderId = 'user1';
      const recipientId = 'user2';
      const message = 'Thinking of you 💭';
      const type = 'quick-pick';

      const result = await sendMarshmallow(
        coupleId,
        senderId,
        recipientId,
        message,
        type,
        { quickPickId: 'pick1' }
      );

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          coupleId,
          senderId,
          recipientId,
          message,
          type,
          read: false,
          quickPickId: 'pick1',
        })
      );
      expect(result).toBe('marshmallow456');
    });

    it('should send a photo marshmallow with photoUrl', async () => {
      const mockDocRef = { id: 'marshmallow789' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const coupleId = 'couple123';
      const senderId = 'user1';
      const recipientId = 'user2';
      const message = 'Look at this!';
      const type = 'photo';

      const result = await sendMarshmallow(
        coupleId,
        senderId,
        recipientId,
        message,
        type,
        { photoUrl: 'https://storage.firebase.com/photo.jpg' }
      );

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          coupleId,
          senderId,
          recipientId,
          message,
          type,
          read: false,
          photoUrl: 'https://storage.firebase.com/photo.jpg',
        })
      );
      expect(result).toBe('marshmallow789');
    });

    it('should throw error when sending marshmallow fails', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        sendMarshmallow('couple123', 'user1', 'user2', 'Test', 'custom')
      ).rejects.toThrow('Failed to send marshmallow. Please try again.');
    });

    it('should include serverTimestamp in marshmallow data', async () => {
      const mockDocRef = { id: 'marshmallow999' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      await sendMarshmallow('couple123', 'user1', 'user2', 'Test', 'custom');

      expect(addDoc).toHaveBeenCalledWith(
        'mock-collection-ref',
        expect.objectContaining({
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        })
      );
    });
  });

  describe('subscribeToCoupleMarshmallows', () => {
    it('should subscribe to marshmallows with correct query', () => {
      const mockUnsubscribe = jest.fn();
      (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
      (query as jest.Mock).mockImplementation((...args) => args);

      const coupleId = 'couple123';
      const callback = jest.fn();

      subscribeToCoupleMarshmallows(coupleId, callback);

      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('coupleId', '==', coupleId);
      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(onSnapshot).toHaveBeenCalled();
    });

    it('should call callback with transformed marshmallows', () => {
      const mockUnsubscribe = jest.fn();
      let snapshotCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        snapshotCallback = callback;
        return mockUnsubscribe;
      });
      (query as jest.Mock).mockImplementation((...args) => args);

      const coupleId = 'couple123';
      const callback = jest.fn();

      subscribeToCoupleMarshmallows(coupleId, callback);

      // Simulate snapshot
      const mockSnapshot = {
        docs: [
          {
            id: 'marshmallow1',
            data: () => ({
              coupleId: 'couple123',
              senderId: 'user1',
              recipientId: 'user2',
              message: 'Hello!',
              type: 'custom',
              photoUrl: undefined,
              quickPickId: undefined,
              createdAt: { seconds: 1234567890, nanoseconds: 0 } as Timestamp,
              read: false,
            }),
          },
        ],
      };

      snapshotCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith([
        {
          id: 'marshmallow1',
          coupleId: 'couple123',
          senderId: 'user1',
          recipientId: 'user2',
          message: 'Hello!',
          type: 'custom',
          photoUrl: undefined,
          quickPickId: undefined,
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
          read: false,
        },
      ]);
    });

    it('should handle marshmallows without createdAt timestamp', () => {
      const mockUnsubscribe = jest.fn();
      let snapshotCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((q, callback) => {
        snapshotCallback = callback;
        return mockUnsubscribe;
      });
      (query as jest.Mock).mockImplementation((...args) => args);

      const callback = jest.fn();
      subscribeToCoupleMarshmallows('couple123', callback);

      const mockSnapshot = {
        docs: [
          {
            id: 'marshmallow1',
            data: () => ({
              coupleId: 'couple123',
              senderId: 'user1',
              recipientId: 'user2',
              message: 'Hello!',
              type: 'custom',
              createdAt: null,
              read: false,
            }),
          },
        ],
      };

      snapshotCallback(mockSnapshot);

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          createdAt: { seconds: 0, nanoseconds: 0 },
        }),
      ]);
    });

    it('should call error callback when snapshot fails', () => {
      let errorCallback: any;

      (onSnapshot as jest.Mock).mockImplementation((q, callback, onError) => {
        errorCallback = onError;
        return jest.fn();
      });
      (query as jest.Mock).mockImplementation((...args) => args);

      const callback = jest.fn();
      const onError = jest.fn();

      subscribeToCoupleMarshmallows('couple123', callback, onError);

      errorCallback(new Error('Firestore error'));

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to load marshmallows. Please try again.',
        })
      );
    });

    it('should return unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);
      (query as jest.Mock).mockImplementation((...args) => args);

      const unsubscribe = subscribeToCoupleMarshmallows('couple123', jest.fn());

      expect(unsubscribe).toBe(mockUnsubscribe);
    });

    it('should throw error if query setup fails', () => {
      (query as jest.Mock).mockImplementation(() => {
        throw new Error('Query error');
      });

      expect(() => {
        subscribeToCoupleMarshmallows('couple123', jest.fn());
      }).toThrow('Failed to subscribe to marshmallows. Please try again.');
    });
  });

  describe('markMarshmallowAsRead', () => {
    it('should mark marshmallow as read', async () => {
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (doc as jest.Mock).mockReturnValue({ id: 'marshmallow123' });

      await markMarshmallowAsRead('marshmallow123');

      expect(doc).toHaveBeenCalledWith({}, 'marshmallows', 'marshmallow123');
      expect(updateDoc).toHaveBeenCalledWith({ id: 'marshmallow123' }, {
        read: true,
      });
    });

    it('should throw error when marking as read fails', async () => {
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      (doc as jest.Mock).mockReturnValue({ id: 'marshmallow123' });

      await expect(markMarshmallowAsRead('marshmallow123')).rejects.toThrow(
        'Failed to mark marshmallow as read. Please try again.'
      );
    });
  });
});
