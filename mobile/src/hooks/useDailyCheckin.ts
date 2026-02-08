import { useState, useEffect, useCallback } from 'react';
import type { DailyCheckin, MoodType, WithId } from '../../../shared/types';
import {
  createDailyCheckin as createDailyCheckinService,
  getTodaysCheckin,
  getPartnerTodaysCheckin,
  getCheckinStreak as getCheckinStreakService,
} from '../services/dailyCheckins';

interface UseDailyCheckinResult {
  myCheckin: WithId<DailyCheckin> | null;
  partnerCheckin: WithId<DailyCheckin> | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook to load today's daily check-ins for both user and partner
 * Provides loading state and error handling
 */
export const useDailyCheckin = (
  userId: string | null,
  coupleId: string | null
): UseDailyCheckinResult => {
  const [myCheckin, setMyCheckin] = useState<WithId<DailyCheckin> | null>(null);
  const [partnerCheckin, setPartnerCheckin] = useState<WithId<DailyCheckin> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!userId || !coupleId) {
      setMyCheckin(null);
      setPartnerCheckin(null);
      setLoading(false);
      return;
    }

    const loadCheckins = async () => {
      setLoading(true);
      setError(null);

      try {
        const [userCheckin, partnerCheckinData] = await Promise.all([
          getTodaysCheckin(userId, coupleId),
          getPartnerTodaysCheckin(userId, coupleId),
        ]);

        setMyCheckin(userCheckin);
        setPartnerCheckin(partnerCheckinData);
      } catch (err) {
        console.error('Error loading check-ins:', err);
        setError(err instanceof Error ? err : new Error('Failed to load check-ins'));
      } finally {
        setLoading(false);
      }
    };

    loadCheckins();
  }, [userId, coupleId, refreshTrigger]);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { myCheckin, partnerCheckin, loading, error, refresh };
};

interface UseCreateCheckinResult {
  createCheckin: (
    mood: MoodType,
    moodNote: string | undefined,
    gratitude: string
  ) => Promise<string>;
  creating: boolean;
  error: Error | null;
}

/**
 * Hook to create daily check-ins
 * Provides creating state and error handling
 */
export const useCreateCheckin = (
  userId: string | null,
  coupleId: string | null
): UseCreateCheckinResult => {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCheckin = useCallback(
    async (mood: MoodType, moodNote: string | undefined, gratitude: string): Promise<string> => {
      if (!userId || !coupleId) {
        const err = new Error('User must be signed in to create check-in');
        setError(err);
        throw err;
      }

      setCreating(true);
      setError(null);

      try {
        const checkinId = await createDailyCheckinService(
          userId,
          coupleId,
          mood,
          moodNote,
          gratitude
        );
        return checkinId;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create check-in');
        setError(error);
        throw error;
      } finally {
        setCreating(false);
      }
    },
    [userId, coupleId]
  );

  return { createCheckin, creating, error };
};

interface UseCheckinStreakResult {
  streak: number;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Hook to get the current check-in streak for a user
 * Provides loading state and error handling
 */
export const useCheckinStreak = (
  userId: string | null,
  coupleId: string | null
): UseCheckinStreakResult => {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!userId || !coupleId) {
      setStreak(0);
      setLoading(false);
      return;
    }

    const loadStreak = async () => {
      setLoading(true);
      setError(null);

      try {
        const streakCount = await getCheckinStreakService(userId, coupleId);
        setStreak(streakCount);
      } catch (err) {
        console.error('Error loading streak:', err);
        setError(err instanceof Error ? err : new Error('Failed to load streak'));
        setStreak(0);
      } finally {
        setLoading(false);
      }
    };

    loadStreak();
  }, [userId, coupleId, refreshTrigger]);

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { streak, loading, error, refresh };
};
