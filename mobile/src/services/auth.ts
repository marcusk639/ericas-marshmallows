import {
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, Couple, CoupleConfig } from '../../../shared/types';

// Couple configuration - Marcus and Erica
const COUPLE_CONFIG: CoupleConfig = {
  coupleId: 'marcus-erica',
  members: {
    'marcus@example.com': {
      name: 'Marcus',
      role: 'partner1',
    },
    'erica@example.com': {
      name: 'Erica',
      role: 'partner2',
    },
  },
};

/**
 * Initialize Google Sign-In configuration
 * Must be called before using Google Sign-In
 */
export const configureGoogleSignIn = () => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variable. ' +
      'Please add it to your .env file.'
    );
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
};

/**
 * Get member configuration for an email address
 * Returns undefined if email is not Marcus or Erica
 */
const getMemberConfig = (email: string): { name: string; role: 'partner1' | 'partner2' } | undefined => {
  return COUPLE_CONFIG.members[email.toLowerCase()];
};

/**
 * Get the partner's user ID from the couple document
 */
const getPartnerId = async (userId: string): Promise<string | null> => {
  try {
    const coupleRef = doc(db, 'couples', COUPLE_CONFIG.coupleId);
    const coupleDoc = await getDoc(coupleRef);

    if (!coupleDoc.exists()) {
      return null;
    }

    const coupleData = coupleDoc.data() as Couple;
    const partnerId = coupleData.memberIds.find(id => id !== userId);

    return partnerId || null;
  } catch (error) {
    console.error('Error getting partner ID:', error);
    return null;
  }
};

/**
 * Create or update couple document in Firestore
 * Only creates if both Marcus and Erica have signed in
 */
const createCoupleIfNeeded = async (userId: string, userName: string): Promise<void> => {
  try {
    const coupleRef = doc(db, 'couples', COUPLE_CONFIG.coupleId);
    const coupleDoc = await getDoc(coupleRef);

    if (coupleDoc.exists()) {
      // Couple already exists, check if we need to add this user
      const coupleData = coupleDoc.data() as Couple;

      if (!coupleData.memberIds.includes(userId)) {
        // Partner is joining - update the couple document
        await setDoc(
          coupleRef,
          {
            memberIds: [coupleData.memberIds[0], userId] as [string, string],
            memberNames: {
              ...coupleData.memberNames,
              [userId]: userName,
            },
          },
          { merge: true }
        );
        console.log('Updated couple document with second partner');
      }
    } else {
      // First person to sign in - create couple document with placeholder
      await setDoc(coupleRef, {
        createdAt: serverTimestamp(),
        memberIds: [userId, ''] as [string, string], // Placeholder for second member
        memberNames: {
          [userId]: userName,
        },
      });
      console.log('Created couple document with first partner');
    }
  } catch (error) {
    console.error('Error creating/updating couple:', error);
    throw new Error('Failed to initialize couple. Please try again.');
  }
};

/**
 * Create or update user profile in Firestore
 */
const createOrUpdateUserProfile = async (
  firebaseUser: FirebaseUser,
  displayName: string
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // User exists, update photo URL if changed
      await setDoc(
        userRef,
        {
          photoUrl: firebaseUser.photoURL || undefined,
        },
        { merge: true }
      );
      console.log('Updated existing user profile');
    } else {
      // Create new user profile
      const userData: User = {
        email: firebaseUser.email!,
        name: displayName,
        coupleId: COUPLE_CONFIG.coupleId,
        photoUrl: firebaseUser.photoURL || undefined,
        createdAt: serverTimestamp() as any,
        settings: {
          morningCheckInTime: '09:00',
          eveningReminderTime: '20:00',
          wifiOnlySync: false,
        },
      };

      await setDoc(userRef, userData);
      console.log('Created new user profile');
    }

    // Create or update couple document
    await createCoupleIfNeeded(firebaseUser.uid, displayName);
  } catch (error) {
    console.error('Error creating/updating user profile:', error);
    throw new Error('Failed to create user profile. Please try again.');
  }
};

/**
 * Sign in with Google
 * Validates that the user is either Marcus or Erica
 * Creates user profile and couple document in Firestore
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  try {
    // Check if Google Play services are available (Android only)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();

    if (!userInfo.data?.idToken) {
      throw new Error('Failed to get Google ID token');
    }

    const email = userInfo.data.user.email;

    if (!email) {
      throw new Error('Failed to get email from Google account');
    }

    // Check if user is Marcus or Erica
    const memberConfig = getMemberConfig(email);

    if (!memberConfig) {
      // Sign out from Google if not authorized
      await GoogleSignin.signOut();
      throw new Error(
        'This app is only available to Marcus and Erica. ' +
        'Please sign in with an authorized account.'
      );
    }

    // Create Google credential
    const credential = GoogleAuthProvider.credential(userInfo.data.idToken);

    // Sign in to Firebase
    const userCredential = await signInWithCredential(auth, credential);

    // Create or update user profile and couple document
    await createOrUpdateUserProfile(userCredential.user, memberConfig.name);

    console.log('Successfully signed in:', memberConfig.name);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);

    // Handle specific error cases
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    }

    if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    }

    // Re-throw custom errors
    if (error.message.includes('only available to Marcus and Erica')) {
      throw error;
    }

    throw new Error('Failed to sign in. Please try again.');
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    // Sign out from Google
    await GoogleSignin.signOut();

    // Sign out from Firebase
    await firebaseSignOut(auth);

    console.log('Successfully signed out');
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Listen to authentication state changes
 * Returns an unsubscribe function
 */
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Check if the current user has a partner
 * Returns true if both Marcus and Erica have signed in
 */
export const hasPartner = async (): Promise<boolean> => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return false;
  }

  const partnerId = await getPartnerId(currentUser.uid);
  return !!partnerId && partnerId !== '';
};

/**
 * Get the current user's profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return { ...userDoc.data(), id: userDoc.id } as User & { id: string };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};
