import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {
  createDailyCheckin,
  getTodaysCheckin,
  getPartnerTodaysCheckin,
  getCheckinStreak,
  getCheckinHistory,
} from '../dailyCheckins';
import type { MoodType } from '../../../../shared/types';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  Timestamp: {
    now: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('dailyCheckins service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDailyCheckin', () => {
    it('should create a check-in with correct data', async () => {
      const mockDocRef = { id: 'checkin123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const userId = 'user123';
      const coupleId = 'couple123';
      const mood: MoodType = 'happy';
      const moodNote = 'Feeling great today!';
      const gratitude = 'Grateful for my partner';

      const result = await createDailyCheckin(userId, coupleId, mood, moodNote, gratitude);

      expect(result).toBe('checkin123');

      const addDocCall = (addDoc as jest.Mock).mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        userId,
        coupleId,
        mood,
        moodNote,
        gratitude,
      });
      expect(addDocCall[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(addDocCall[1].createdAt).toBeDefined();
    });

    it('should create a check-in without moodNote when not provided', async () => {
      const mockDocRef = { id: 'checkin124' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      const userId = 'user123';
      const coupleId = 'couple123';
      const mood: MoodType = 'peaceful';
      const gratitude = 'Grateful for good weather';

      const result = await createDailyCheckin(userId, coupleId, mood, undefined, gratitude);

      expect(result).toBe('checkin124');

      const addDocCall = (addDoc as jest.Mock).mock.calls[0];
      expect(addDocCall[1]).toMatchObject({
        userId,
        coupleId,
        mood,
        gratitude,
      });
      expect(addDocCall[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(addDocCall[1].createdAt).toBeDefined();
      expect(addDocCall[1].moodNote).toBeUndefined();
    });

    it('should throw an error when creation fails', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(
        createDailyCheckin('user123', 'couple123', 'happy', undefined, 'Grateful')
      ).rejects.toThrow('Failed to create daily check-in. Please try again.');
    });
  });

  describe('getTodaysCheckin', () => {
    it('should retrieve today\'s check-in for user', async () => {
      const mockCheckin = {
        id: 'checkin123',
        data: () => ({
          userId: 'user123',
          coupleId: 'couple123',
          mood: 'happy',
          moodNote: 'Great day',
          gratitude: 'Grateful for sunshine',
          date: '2026-02-07',
          createdAt: { seconds: 1234567890, nanoseconds: 0 },
        }),
      };

      (getDocs as jest.Mock).mockResolvedValue({
        docs: [mockCheckin],
        empty: false,
      });

      const result = await getTodaysCheckin('user123', 'couple123');

      expect(result).toEqual({
        id: 'checkin123',
        userId: 'user123',
        coupleId: 'couple123',
        mood: 'happy',
        moodNote: 'Great day',
        gratitude: 'Grateful for sunshine',
        date: '2026-02-07',
        createdAt: { seconds: 1234567890, nanoseconds: 0 },
      });
      expect(query).toHaveBeenCalled();
      expect(where).toHaveBeenCalledWith('userId', '==', 'user123');
      expect(where).toHaveBeenCalledWith('coupleId', '==', 'couple123');
      expect(where).toHaveBeenCalledWith('date', '==', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    });

    it('should return null when no check-in exists for today', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getTodaysCheckin('user123', 'couple123');

      expect(result).toBeNull();
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getTodaysCheckin('user123', 'couple123')).rejects.toThrow(
        'Failed to get today\'s check-in. Please try again.'
      );
    });
  });

  describe('getPartnerTodaysCheckin', () => {
    it('should retrieve partner\'s check-in for today', async () => {
      const mockCheckin = {
        id: 'checkin124',
        data: () => ({
          userId: 'partner123',
          coupleId: 'couple123',
          mood: 'loving',
          moodNote: 'Missing you',
          gratitude: 'Grateful for our time together',
          date: '2026-02-07',
          createdAt: { seconds: 1234567891, nanoseconds: 0 },
        }),
      };

      (getDocs as jest.Mock).mockResolvedValue({
        docs: [mockCheckin],
        empty: false,
      });

      const result = await getPartnerTodaysCheckin('user123', 'couple123');

      expect(result).toEqual({
        id: 'checkin124',
        userId: 'partner123',
        coupleId: 'couple123',
        mood: 'loving',
        moodNote: 'Missing you',
        gratitude: 'Grateful for our time together',
        date: '2026-02-07',
        createdAt: { seconds: 1234567891, nanoseconds: 0 },
      });
      expect(where).toHaveBeenCalledWith('userId', '!=', 'user123');
      expect(where).toHaveBeenCalledWith('coupleId', '==', 'couple123');
    });

    it('should return null when partner hasn\'t checked in today', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getPartnerTodaysCheckin('user123', 'couple123');

      expect(result).toBeNull();
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getPartnerTodaysCheckin('user123', 'couple123')).rejects.toThrow(
        'Failed to get partner\'s check-in. Please try again.'
      );
    });
  });

  describe('getCheckinStreak', () => {
    it('should calculate consecutive days streak', async () => {
      // Get today's date and calculate expected dates
      const today = new Date();
      const dates = [0, 1, 2].map(daysAgo => {
        const date = new Date(today);
        date.setDate(today.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
      });

      const mockCheckins = [
        {
          id: 'c1',
          data: () => ({ date: dates[0], userId: 'user123', coupleId: 'couple123', mood: 'happy', gratitude: 'Test', createdAt: { seconds: 1234567893, nanoseconds: 0 } }),
        },
        {
          id: 'c2',
          data: () => ({ date: dates[1], userId: 'user123', coupleId: 'couple123', mood: 'happy', gratitude: 'Test', createdAt: { seconds: 1234567892, nanoseconds: 0 } }),
        },
        {
          id: 'c3',
          data: () => ({ date: dates[2], userId: 'user123', coupleId: 'couple123', mood: 'happy', gratitude: 'Test', createdAt: { seconds: 1234567891, nanoseconds: 0 } }),
        },
        {
          id: 'c4',
          data: () => ({ date: '2026-01-01', userId: 'user123', coupleId: 'couple123', mood: 'happy', gratitude: 'Test', createdAt: { seconds: 1234567890, nanoseconds: 0 } }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockCheckins,
        empty: false,
      });

      const result = await getCheckinStreak('user123', 'couple123');

      expect(result).toBe(3); // Today, yesterday, and day before are consecutive
      expect(orderBy).toHaveBeenCalledWith('date', 'desc');
    });

    it('should return 0 when no check-ins exist', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getCheckinStreak('user123', 'couple123');

      expect(result).toBe(0);
    });

    it('should return 1 when only today\'s check-in exists', async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      const mockCheckins = [
        {
          id: 'c1',
          data: () => ({ date: todayStr, userId: 'user123', coupleId: 'couple123', mood: 'happy', gratitude: 'Test', createdAt: { seconds: 1234567890, nanoseconds: 0 } }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockCheckins,
        empty: false,
      });

      const result = await getCheckinStreak('user123', 'couple123');

      expect(result).toBe(1);
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getCheckinStreak('user123', 'couple123')).rejects.toThrow(
        'Failed to calculate check-in streak. Please try again.'
      );
    });
  });

  describe('getCheckinHistory', () => {
    it('should retrieve past check-ins with limit', async () => {
      const mockCheckins = [
        {
          id: 'c1',
          data: () => ({
            userId: 'user123',
            coupleId: 'couple123',
            mood: 'happy',
            gratitude: 'Test 1',
            date: '2026-02-07',
            createdAt: { seconds: 1234567893, nanoseconds: 0 },
          }),
        },
        {
          id: 'c2',
          data: () => ({
            userId: 'user123',
            coupleId: 'couple123',
            mood: 'peaceful',
            moodNote: 'Note',
            gratitude: 'Test 2',
            date: '2026-02-06',
            createdAt: { seconds: 1234567892, nanoseconds: 0 },
          }),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        docs: mockCheckins,
        empty: false,
      });

      const result = await getCheckinHistory('user123', 'couple123', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'c1',
        userId: 'user123',
        coupleId: 'couple123',
        mood: 'happy',
        gratitude: 'Test 1',
        date: '2026-02-07',
        createdAt: { seconds: 1234567893, nanoseconds: 0 },
      });
      expect(result[1]).toEqual({
        id: 'c2',
        userId: 'user123',
        coupleId: 'couple123',
        mood: 'peaceful',
        moodNote: 'Note',
        gratitude: 'Test 2',
        date: '2026-02-06',
        createdAt: { seconds: 1234567892, nanoseconds: 0 },
      });
      expect(orderBy).toHaveBeenCalledWith('date', 'desc');
      expect(limit).toHaveBeenCalledWith(10);
    });

    it('should use default limit of 30 when not specified', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      await getCheckinHistory('user123', 'couple123');

      expect(limit).toHaveBeenCalledWith(30);
    });

    it('should return empty array when no check-ins exist', async () => {
      (getDocs as jest.Mock).mockResolvedValue({
        docs: [],
        empty: true,
      });

      const result = await getCheckinHistory('user123', 'couple123', 10);

      expect(result).toEqual([]);
    });

    it('should throw an error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));

      await expect(getCheckinHistory('user123', 'couple123', 10)).rejects.toThrow(
        'Failed to get check-in history. Please try again.'
      );
    });
  });
});
