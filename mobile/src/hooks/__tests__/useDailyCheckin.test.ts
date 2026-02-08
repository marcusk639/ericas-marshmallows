import { renderHook, act } from '@testing-library/react-hooks';
import {
  useDailyCheckin,
  useCreateCheckin,
  useCheckinStreak,
} from '../useDailyCheckin';
import * as dailyCheckinsService from '../../services/dailyCheckins';
import type { MoodType, DailyCheckin, WithId } from '../../../../shared/types';

// Mock the daily checkins service
jest.mock('../../services/dailyCheckins');

describe('useDailyCheckin hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useDailyCheckin', () => {
    it('should load today\'s check-ins on mount', async () => {
      const mockUserCheckin: WithId<DailyCheckin> = {
        id: 'checkin1',
        userId: 'user123',
        coupleId: 'couple123',
        mood: 'happy',
        moodNote: 'Great day!',
        gratitude: 'Grateful for sunshine',
        date: '2026-02-08',
        createdAt: { seconds: 1234567890, nanoseconds: 0 },
      };

      const mockPartnerCheckin: WithId<DailyCheckin> = {
        id: 'checkin2',
        userId: 'partner123',
        coupleId: 'couple123',
        mood: 'loving',
        gratitude: 'Grateful for my partner',
        date: '2026-02-08',
        createdAt: { seconds: 1234567891, nanoseconds: 0 },
      };

      jest.spyOn(dailyCheckinsService, 'getTodaysCheckin').mockResolvedValue(mockUserCheckin);
      jest.spyOn(dailyCheckinsService, 'getPartnerTodaysCheckin').mockResolvedValue(mockPartnerCheckin);

      const { result } = renderHook(() => useDailyCheckin('user123', 'couple123'));

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(result.current.myCheckin).toEqual(mockUserCheckin);
      expect(result.current.partnerCheckin).toEqual(mockPartnerCheckin);
      expect(result.current.error).toBeNull();
      expect(dailyCheckinsService.getTodaysCheckin).toHaveBeenCalledWith('user123', 'couple123');
      expect(dailyCheckinsService.getPartnerTodaysCheckin).toHaveBeenCalledWith('user123', 'couple123');
    });

    it('should handle when no check-ins exist', async () => {
      jest.spyOn(dailyCheckinsService, 'getTodaysCheckin').mockResolvedValue(null);
      jest.spyOn(dailyCheckinsService, 'getPartnerTodaysCheckin').mockResolvedValue(null);

      const { result } = renderHook(() => useDailyCheckin('user123', 'couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(result.current.myCheckin).toBeNull();
      expect(result.current.partnerCheckin).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle errors when loading check-ins', async () => {
      const error = new Error('Failed to load check-ins');
      jest.spyOn(dailyCheckinsService, 'getTodaysCheckin').mockRejectedValue(error);
      jest.spyOn(dailyCheckinsService, 'getPartnerTodaysCheckin').mockResolvedValue(null);

      const { result } = renderHook(() => useDailyCheckin('user123', 'couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(result.current.error).toBeTruthy();
      expect(result.current.myCheckin).toBeNull();
    });

    it('should not load check-ins when userId or coupleId is null', () => {
      const { result } = renderHook(() => useDailyCheckin(null, null));

      expect(result.current.loading).toBe(false);
      expect(result.current.myCheckin).toBeNull();
      expect(result.current.partnerCheckin).toBeNull();
      expect(dailyCheckinsService.getTodaysCheckin).not.toHaveBeenCalled();
    });

    it('should refresh check-ins when refresh is called', async () => {
      const mockUserCheckin: WithId<DailyCheckin> = {
        id: 'checkin1',
        userId: 'user123',
        coupleId: 'couple123',
        mood: 'happy',
        gratitude: 'Test',
        date: '2026-02-08',
        createdAt: { seconds: 1234567890, nanoseconds: 0 },
      };

      jest.spyOn(dailyCheckinsService, 'getTodaysCheckin').mockResolvedValue(mockUserCheckin);
      jest.spyOn(dailyCheckinsService, 'getPartnerTodaysCheckin').mockResolvedValue(null);

      const { result } = renderHook(() => useDailyCheckin('user123', 'couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(dailyCheckinsService.getTodaysCheckin).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refresh();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(dailyCheckinsService.getTodaysCheckin).toHaveBeenCalledTimes(2);
    });
  });

  describe('useCreateCheckin', () => {
    it('should create a check-in successfully', async () => {
      jest.spyOn(dailyCheckinsService, 'createDailyCheckin').mockResolvedValue('checkin123');

      const { result } = renderHook(() => useCreateCheckin('user123', 'couple123'));

      expect(result.current.creating).toBe(false);

      let checkinId: string | undefined;

      await act(async () => {
        checkinId = await result.current.createCheckin('happy', undefined, 'Grateful for today');
      });

      expect(checkinId).toBe('checkin123');
      expect(result.current.creating).toBe(false);
      expect(result.current.error).toBeNull();
      expect(dailyCheckinsService.createDailyCheckin).toHaveBeenCalledWith(
        'user123',
        'couple123',
        'happy',
        undefined,
        'Grateful for today'
      );
    });

    it('should show loading state while creating', async () => {
      jest.spyOn(dailyCheckinsService, 'createDailyCheckin').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('checkin123'), 100))
      );

      const { result } = renderHook(() => useCreateCheckin('user123', 'couple123'));

      expect(result.current.creating).toBe(false);

      act(() => {
        result.current.createCheckin('happy', 'Note', 'Grateful');
      });

      expect(result.current.creating).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(result.current.creating).toBe(false);
    });

    it('should handle errors when creating check-in', async () => {
      const error = new Error('Failed to create check-in');
      jest.spyOn(dailyCheckinsService, 'createDailyCheckin').mockRejectedValue(error);

      const { result } = renderHook(() => useCreateCheckin('user123', 'couple123'));

      await act(async () => {
        try {
          await result.current.createCheckin('happy', undefined, 'Grateful');
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.creating).toBe(false);
    });

    it('should throw error when userId or coupleId is null', async () => {
      const { result } = renderHook(() => useCreateCheckin(null, null));

      await expect(async () => {
        await act(async () => {
          await result.current.createCheckin('happy', undefined, 'Grateful');
        });
      }).rejects.toThrow('User must be signed in to create check-in');
    });
  });

  describe('useCheckinStreak', () => {
    it('should load streak on mount', async () => {
      jest.spyOn(dailyCheckinsService, 'getCheckinStreak').mockResolvedValue(5);

      const { result } = renderHook(() => useCheckinStreak('user123', 'couple123'));

      expect(result.current.loading).toBe(true);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(result.current.streak).toBe(5);
      expect(result.current.error).toBeNull();
      expect(dailyCheckinsService.getCheckinStreak).toHaveBeenCalledWith('user123', 'couple123');
    });

    it('should handle zero streak', async () => {
      jest.spyOn(dailyCheckinsService, 'getCheckinStreak').mockResolvedValue(0);

      const { result } = renderHook(() => useCheckinStreak('user123', 'couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(result.current.streak).toBe(0);
    });

    it('should handle errors when loading streak', async () => {
      const error = new Error('Failed to load streak');
      jest.spyOn(dailyCheckinsService, 'getCheckinStreak').mockRejectedValue(error);

      const { result } = renderHook(() => useCheckinStreak('user123', 'couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(result.current.error).toBeTruthy();
      expect(result.current.streak).toBe(0);
    });

    it('should not load streak when userId or coupleId is null', () => {
      const { result } = renderHook(() => useCheckinStreak(null, null));

      expect(result.current.loading).toBe(false);
      expect(result.current.streak).toBe(0);
      expect(dailyCheckinsService.getCheckinStreak).not.toHaveBeenCalled();
    });

    it('should refresh streak when refresh is called', async () => {
      jest.spyOn(dailyCheckinsService, 'getCheckinStreak').mockResolvedValue(3);

      const { result } = renderHook(() => useCheckinStreak('user123', 'couple123'));

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(result.current.loading).toBe(false);

      expect(dailyCheckinsService.getCheckinStreak).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.refresh();
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(dailyCheckinsService.getCheckinStreak).toHaveBeenCalledTimes(2);
    });
  });
});
