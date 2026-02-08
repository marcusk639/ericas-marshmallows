/**
 * Tests for Firebase Cloud Functions
 */

// Set required environment variables
process.env.GCLOUD_PROJECT = 'test-project';
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: 'test-project',
  databaseURL: 'https://test-project.firebaseio.com',
});

// Mock firebase-admin before importing anything
const mockSend = jest.fn();
const mockUpdate = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

jest.mock('firebase-admin', () => {
  const mockFirestore = jest.fn(() => ({
    collection: mockCollection,
  }));

  const mockMessaging = jest.fn(() => ({
    send: mockSend,
  }));

  return {
    initializeApp: jest.fn(),
    firestore: mockFirestore,
    messaging: mockMessaging,
  };
});

// Now import the functions
import * as myFunctions from '../index';

describe('Cloud Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockReturnValue({
      doc: mockDoc,
    });
    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
    });
  });

  describe('onMarshmallowCreated', () => {
    it('should send notification when marshmallow is created', async () => {
      const marshmallowData = {
        senderId: 'sender123',
        recipientId: 'recipient123',
        message: 'I love you!',
        coupleId: 'couple123',
        type: 'custom',
        read: false,
        createdAt: new Date(),
      };

      // Mock Firestore responses
      mockDoc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => {
            if (docId === 'recipient123') {
              return {
                name: 'Erica',
                fcmToken: 'fcm-token-123',
              };
            }
            if (docId === 'sender123') {
              return {
                name: 'Marcus',
              };
            }
            return null;
          },
        }),
      }));

      mockSend.mockResolvedValue('message-id');

      // Create test snapshot and context
      const snapshot = {
        data: () => marshmallowData,
      };
      const context = {
        params: {
          marshmallowId: 'marshmallow123',
        },
      };

      // Execute function
      await myFunctions.onMarshmallowCreated(snapshot as any, context as any);

      // Verify notification was sent
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'fcm-token-123',
          notification: expect.objectContaining({
            title: 'Marcus sent you a marshmallow 🤍',
            body: 'I love you!',
          }),
          data: {
            type: 'marshmallow',
            marshmallowId: 'marshmallow123',
            senderId: 'sender123',
          },
        })
      );
    });

    it('should handle missing FCM token gracefully', async () => {
      const marshmallowData = {
        senderId: 'sender123',
        recipientId: 'recipient123',
        message: 'Test',
        coupleId: 'couple123',
        type: 'custom',
        read: false,
        createdAt: new Date(),
      };

      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({
          name: 'Erica',
          // No fcmToken
        }),
      });

      const snapshot = {
        data: () => marshmallowData,
      };
      const context = { params: { marshmallowId: 'marshmallow123' } };

      await myFunctions.onMarshmallowCreated(snapshot as any, context as any);

      // Should not send notification
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle missing recipient user gracefully', async () => {
      const marshmallowData = {
        senderId: 'sender123',
        recipientId: 'recipient123',
        message: 'Test',
        coupleId: 'couple123',
        type: 'custom',
        read: false,
        createdAt: new Date(),
      };

      mockGet.mockResolvedValue({
        exists: false,
      });

      const snapshot = {
        data: () => marshmallowData,
      };
      const context = { params: { marshmallowId: 'marshmallow123' } };

      await myFunctions.onMarshmallowCreated(snapshot as any, context as any);

      // Should not send notification
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('onCheckinCreated', () => {
    it('should send notification when check-in is created', async () => {
      const checkinData = {
        userId: 'user1',
        coupleId: 'couple123',
        mood: 'happy',
        gratitude: 'Grateful for you',
        date: '2026-02-08',
        createdAt: new Date(),
      };

      // Mock responses
      mockDoc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => {
            if (docId === 'couple123') {
              return {
                memberIds: ['user1', 'user2'],
              };
            }
            if (docId === 'user2') {
              return {
                name: 'Erica',
                fcmToken: 'partner-fcm-token',
              };
            }
            if (docId === 'user1') {
              return {
                name: 'Marcus',
              };
            }
            return null;
          },
        }),
      }));

      mockSend.mockResolvedValue('message-id');

      const snapshot = {
        data: () => checkinData,
      };
      const context = { params: { checkinId: 'checkin123' } };

      await myFunctions.onCheckinCreated(snapshot as any, context as any);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'partner-fcm-token',
          notification: expect.objectContaining({
            title: 'Marcus checked in for today 💕',
            body: `See how they're feeling`,
          }),
          data: {
            type: 'checkin',
            checkinId: 'checkin123',
            userId: 'user1',
            date: '2026-02-08',
          },
        })
      );
    });

    it('should handle missing couple gracefully', async () => {
      const checkinData = {
        userId: 'user1',
        coupleId: 'couple123',
        mood: 'happy',
        gratitude: 'Test',
        date: '2026-02-08',
        createdAt: new Date(),
      };

      mockGet.mockResolvedValue({ exists: false });

      const snapshot = {
        data: () => checkinData,
      };
      const context = { params: { checkinId: 'checkin123' } };

      await myFunctions.onCheckinCreated(snapshot as any, context as any);

      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('onMemoryCreated', () => {
    it('should send notification when memory is created', async () => {
      const memoryData = {
        createdBy: 'user1',
        coupleId: 'couple123',
        title: 'Our Date Night',
        description: 'Had a great time!',
        photoUrls: ['photo1.jpg'],
        tags: ['date'],
        date: new Date(),
        source: 'manual',
        createdAt: new Date(),
      };

      mockDoc.mockImplementation((docId: string) => ({
        get: jest.fn().mockResolvedValue({
          exists: true,
          data: () => {
            if (docId === 'couple123') {
              return {
                memberIds: ['user1', 'user2'],
              };
            }
            if (docId === 'user2') {
              return {
                name: 'Erica',
                fcmToken: 'partner-fcm-token',
              };
            }
            if (docId === 'user1') {
              return {
                name: 'Marcus',
              };
            }
            return null;
          },
        }),
      }));

      mockSend.mockResolvedValue('message-id');

      const snapshot = {
        data: () => memoryData,
      };
      const context = { params: { memoryId: 'memory123' } };

      await myFunctions.onMemoryCreated(snapshot as any, context as any);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'partner-fcm-token',
          notification: expect.objectContaining({
            title: 'Marcus added a new memory 📸',
            body: 'Our Date Night',
          }),
          data: {
            type: 'memory',
            memoryId: 'memory123',
            creatorId: 'user1',
          },
        })
      );
    });
  });

  describe('updateFCMToken', () => {
    it('should update FCM token for authenticated user', async () => {
      const data = {
        fcmToken: 'new-fcm-token-123',
      };

      const context = {
        auth: {
          uid: 'user123',
        },
      };

      mockUpdate.mockResolvedValue(undefined);

      const result = await myFunctions.updateFCMToken(data as any, context as any);

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fcmToken: 'new-fcm-token-123',
        })
      );
    });

    it('should reject unauthenticated requests', async () => {
      const data = {
        fcmToken: 'new-fcm-token-123',
      };

      const context = {
        // No auth
      };

      await expect(myFunctions.updateFCMToken(data as any, context as any)).rejects.toThrow();
    });

    it('should reject requests without FCM token', async () => {
      const data = {
        // No fcmToken
      };

      const context = {
        auth: {
          uid: 'user123',
        },
      };

      await expect(myFunctions.updateFCMToken(data as any, context as any)).rejects.toThrow();
    });
  });
});
