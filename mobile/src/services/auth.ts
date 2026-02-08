import {
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { doc, setDoc, getDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, Couple, CoupleConfig } from '../../../shared/types';

// Complete web browser auth session
WebBrowser.maybeCompleteAuthSession();

// Couple configuration - Marcus and Erica
// Email addresses are loaded from environment variables for security
const COUPLE_CONFIG: CoupleConfig = {
  coupleId: 'marcus-erica',
  members: {
    [process.env.EXPO_PUBLIC_PARTNER1_EMAIL || '']: {
      name: 'Marcus',
      role: 'partner1',
    },
    [process.env.EXPO_PUBLIC_PARTNER2_EMAIL || '']: {
      name: 'Erica',
      role: 'partner2',
    },
  },
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
 * Uses transaction to prevent race conditions during simultaneous sign-ins
 */
const createCoupleIfNeeded = async (userId: string, userName: string): Promise<void> => {
  try {
    const coupleRef = doc(db, 'couples', COUPLE_CONFIG.coupleId);

    await runTransaction(db, async (transaction) => {
      const coupleDoc = await transaction.get(coupleRef);

      if (coupleDoc.exists()) {
        // Couple already exists, check if we need to add this user
        const coupleData = coupleDoc.data() as Couple;

        if (!coupleData.memberIds.includes(userId)) {
          // Partner is joining - update the couple document atomically
          transaction.update(coupleRef, {
            memberIds: [coupleData.memberIds[0], userId] as [string, string],
            memberNames: {
              ...coupleData.memberNames,
              [userId]: userName,
            },
            updatedAt: serverTimestamp(),
          });
          console.log('Updated couple document with second partner');
        }
      } else {
        // Couple doesn't exist yet - create with first user
        transaction.set(coupleRef, {
          memberIds: [userId] as unknown as [string, string],
          memberNames: {
            [userId]: userName,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('Created couple document for first partner');
      }
    });
  } catch (error) {
    console.error('Error creating/updating couple:', error);
    throw new Error('Failed to set up couple connection. Please try again.');
  }
};

/**
 * Create or update user profile in Firestore
 * Called after successful Google sign-in
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
      if (!firebaseUser.email) {
        throw new Error('User email is required but not available');
      }

      const userData: any = {
        email: firebaseUser.email,
        name: displayName,
        coupleId: COUPLE_CONFIG.coupleId,
        createdAt: serverTimestamp(),
        settings: {
          morningCheckInTime: '09:00',
          eveningReminderTime: '20:00',
          wifiOnlySync: false,
        },
      };

      // Only include photoUrl if it exists (Google OAuth has photo, email/password doesn't)
      if (firebaseUser.photoURL) {
        userData.photoUrl = firebaseUser.photoURL;
      }

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
 * Use Google authentication hook
 * Call this at the component level to set up Google auth
 */
export const useGoogleAuth = () => {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  if (!webClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID environment variable. ' +
      'Please add it to your .env file.'
    );
  }

  if (!iosClientId) {
    throw new Error(
      'Missing EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID environment variable. ' +
      'Please add it to your .env file.'
    );
  }

  // For development build, we need to specify a scheme-based redirect URI
  const redirectUri = `ericasmarshmallows://`;

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId,
    iosClientId,
    redirectUri,
  });

  return { request, response, promptAsync };
};

/**
 * Sign in with Google using the auth response
 * Validates that the user is either Marcus or Erica
 * Creates user profile and couple document in Firestore
 */
export const signInWithGoogle = async (idToken: string, accessToken: string): Promise<FirebaseUser> => {
  try {
    // Create Google credential
    const credential = GoogleAuthProvider.credential(idToken, accessToken);

    // Sign in to Firebase with Google credential
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    const email = firebaseUser.email;

    if (!email) {
      throw new Error('Failed to get email from Google account');
    }

    // Check if user is Marcus or Erica
    const memberConfig = getMemberConfig(email);

    if (!memberConfig) {
      // Sign out from Firebase if not authorized
      await firebaseSignOut(auth);
      throw new Error(
        'This app is only available to Marcus and Erica. ' +
        'Please sign in with an authorized account.'
      );
    }

    // Create or update user profile in Firestore
    await createOrUpdateUserProfile(firebaseUser, memberConfig.name);

    console.log(`Successfully signed in as ${memberConfig.name}`);
    return firebaseUser;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to sign in with Google. Please try again.');
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
    console.log('Successfully signed out');
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

/**
 * Get the currently signed-in Firebase user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export const subscribeToAuthChanges = (
  callback: (user: FirebaseUser | null) => void
): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<(User & { id: string }) | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
    } as User & { id: string };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Check if the current user's account is set up
 * Returns true if user has completed profile setup
 */
export const isAccountSetup = async (): Promise<boolean> => {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  const profile = await getUserProfile(user.uid);
  return profile !== null;
};

/**
 * Sign up with email and password
 * Creates a new user account and profile in Firestore
 * Note: Display name is automatically set based on authorized email (Marcus or Erica)
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    // Validate email is authorized (Marcus or Erica)
    const memberConfig = getMemberConfig(email);

    if (!memberConfig) {
      throw new Error(
        'This app is only available to Marcus and Erica. ' +
        'Please use an authorized email address.'
      );
    }

    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, {
      displayName: memberConfig.name,
    });

    // Create user profile in Firestore
    await createOrUpdateUserProfile(firebaseUser, memberConfig.name);

    console.log(`Successfully created account for ${memberConfig.name}`);
    return firebaseUser;
  } catch (error: any) {
    console.error('Error signing up with email:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please use at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create account. Please try again.');
  }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    // Validate email is authorized (Marcus or Erica)
    const memberConfig = getMemberConfig(email);

    if (!memberConfig) {
      throw new Error(
        'This app is only available to Marcus and Erica. ' +
        'Please use an authorized email address.'
      );
    }

    // Sign in with email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Ensure profile exists in Firestore
    await createOrUpdateUserProfile(firebaseUser, memberConfig.name);

    console.log(`Successfully signed in as ${memberConfig.name}`);
    return firebaseUser;
  } catch (error: any) {
    console.error('Error signing in with email:', error);

    // Handle specific Firebase errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please try again later.');
    }

    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to sign in. Please try again.');
  }
};
