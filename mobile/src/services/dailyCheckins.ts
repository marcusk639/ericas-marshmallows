import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { DailyCheckin, MoodType, WithId } from '../../../shared/types';

/**
 * Get today's date in YYYY-MM-DD format
 */
const getTodayDate = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

/**
 * Create a daily check-in for a user
 */
export const createDailyCheckin = async (
  userId: string,
  coupleId: string,
  mood: MoodType,
  moodNote: string | undefined,
  gratitude: string
): Promise<string> => {
  try {
    const checkinData: any = {
      userId,
      coupleId,
      mood,
      gratitude,
      date: getTodayDate(),
      createdAt: serverTimestamp(),
    };

    // Only add moodNote if it's provided
    if (moodNote !== undefined) {
      checkinData.moodNote = moodNote;
    }

    const docRef = await addDoc(collection(db, 'dailyCheckins'), checkinData);
    console.log('Successfully created daily check-in:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating daily check-in:', error);
    throw new Error('Failed to create daily check-in. Please try again.');
  }
};

/**
 * Get today's check-in for a specific user
 */
export const getTodaysCheckin = async (
  userId: string,
  coupleId: string
): Promise<WithId<DailyCheckin> | null> => {
  try {
    const today = getTodayDate();
    const q = query(
      collection(db, 'dailyCheckins'),
      where('userId', '==', userId),
      where('coupleId', '==', coupleId),
      where('date', '==', today)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      userId: data.userId,
      coupleId: data.coupleId,
      mood: data.mood,
      moodNote: data.moodNote,
      gratitude: data.gratitude,
      date: data.date,
      createdAt: data.createdAt,
    };
  } catch (error) {
    console.error('Error getting today\'s check-in:', error);
    throw new Error('Failed to get today\'s check-in. Please try again.');
  }
};

/**
 * Get partner's check-in for today
 */
export const getPartnerTodaysCheckin = async (
  userId: string,
  coupleId: string
): Promise<WithId<DailyCheckin> | null> => {
  try {
    const today = getTodayDate();
    const q = query(
      collection(db, 'dailyCheckins'),
      where('userId', '!=', userId),
      where('coupleId', '==', coupleId),
      where('date', '==', today)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      userId: data.userId,
      coupleId: data.coupleId,
      mood: data.mood,
      moodNote: data.moodNote,
      gratitude: data.gratitude,
      date: data.date,
      createdAt: data.createdAt,
    };
  } catch (error) {
    console.error('Error getting partner\'s check-in:', error);
    throw new Error('Failed to get partner\'s check-in. Please try again.');
  }
};

/**
 * Calculate the current check-in streak for a user
 * Returns the number of consecutive days the user has checked in
 */
export const getCheckinStreak = async (
  userId: string,
  coupleId: string
): Promise<number> => {
  try {
    const q = query(
      collection(db, 'dailyCheckins'),
      where('userId', '==', userId),
      where('coupleId', '==', coupleId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0;
    }

    const checkins = snapshot.docs.map((doc) => doc.data().date);

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < checkins.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (checkins[i] === expectedDateStr) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating check-in streak:', error);
    throw new Error('Failed to calculate check-in streak. Please try again.');
  }
};

/**
 * Get check-in history for a user
 */
export const getCheckinHistory = async (
  userId: string,
  coupleId: string,
  limitCount: number = 30
): Promise<WithId<DailyCheckin>[]> => {
  try {
    const q = query(
      collection(db, 'dailyCheckins'),
      where('userId', '==', userId),
      where('coupleId', '==', coupleId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        coupleId: data.coupleId,
        mood: data.mood,
        moodNote: data.moodNote,
        gratitude: data.gratitude,
        date: data.date,
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    console.error('Error getting check-in history:', error);
    throw new Error('Failed to get check-in history. Please try again.');
  }
};
