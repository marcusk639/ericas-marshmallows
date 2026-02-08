import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getQuickPicks, getQuickPicksByCategory } from '../quickPicks';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  db: {},
}));

describe('quickPicks service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuickPicks', () => {
    it('should retrieve all quick picks ordered by order field', async () => {
      const mockDocs = [
        {
          id: 'pick1',
          data: () => ({
            message: 'I love you',
            emoji: '❤️',
            category: 'loving',
            order: 1,
          }),
        },
        {
          id: 'pick2',
          data: () => ({
            message: 'Miss you',
            emoji: '🥺',
            category: 'sweet',
            order: 2,
          }),
        },
      ];

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      (query as jest.Mock).mockImplementation((...args) => args);

      const result = await getQuickPicks();

      expect(query).toHaveBeenCalled();
      expect(orderBy).toHaveBeenCalledWith('order', 'asc');
      expect(getDocs).toHaveBeenCalled();

      expect(result).toEqual([
        {
          id: 'pick1',
          message: 'I love you',
          emoji: '❤️',
          category: 'loving',
        },
        {
          id: 'pick2',
          message: 'Miss you',
          emoji: '🥺',
          category: 'sweet',
        },
      ]);
    });

    it('should handle empty result', async () => {
      const mockSnapshot = {
        docs: [],
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      (query as jest.Mock).mockImplementation((...args) => args);

      const result = await getQuickPicks();

      expect(result).toEqual([]);
    });

    it('should throw error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      (query as jest.Mock).mockImplementation((...args) => args);

      await expect(getQuickPicks()).rejects.toThrow(
        'Failed to load quick picks. Please try again.'
      );
    });
  });

  describe('getQuickPicksByCategory', () => {
    it('should filter quick picks by category', async () => {
      const mockDocs = [
        {
          id: 'pick1',
          data: () => ({
            message: 'I love you',
            emoji: '❤️',
            category: 'loving',
            order: 1,
          }),
        },
        {
          id: 'pick2',
          data: () => ({
            message: 'Miss you',
            emoji: '🥺',
            category: 'sweet',
            order: 2,
          }),
        },
        {
          id: 'pick3',
          data: () => ({
            message: "You're amazing",
            emoji: '✨',
            category: 'loving',
            order: 3,
          }),
        },
      ];

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      (query as jest.Mock).mockImplementation((...args) => args);

      const result = await getQuickPicksByCategory('loving');

      expect(result).toEqual([
        {
          id: 'pick1',
          message: 'I love you',
          emoji: '❤️',
          category: 'loving',
        },
        {
          id: 'pick3',
          message: "You're amazing",
          emoji: '✨',
          category: 'loving',
        },
      ]);
    });

    it('should return empty array when no matches', async () => {
      const mockDocs = [
        {
          id: 'pick1',
          data: () => ({
            message: 'I love you',
            emoji: '❤️',
            category: 'loving',
            order: 1,
          }),
        },
      ];

      const mockSnapshot = {
        docs: mockDocs,
      };

      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
      (query as jest.Mock).mockImplementation((...args) => args);

      const result = await getQuickPicksByCategory('playful');

      expect(result).toEqual([]);
    });

    it('should throw error when retrieval fails', async () => {
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      (query as jest.Mock).mockImplementation((...args) => args);

      await expect(getQuickPicksByCategory('loving')).rejects.toThrow(
        'Failed to load quick picks. Please try again.'
      );
    });
  });
});
