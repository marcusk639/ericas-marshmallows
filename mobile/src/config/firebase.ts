import { initializeApp, getApps } from 'firebase/app';
// @ts-ignore - getReactNativePersistence exists at runtime but not in TS definitions (Firebase 12 issue)
import { initializeAuth, getReactNativePersistence, getAuth, type Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Validate required environment variables
const requiredEnvVars = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
    'Please ensure all required variables are set in your .env file.'
  );
}

const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey!,
  authDomain: requiredEnvVars.authDomain!,
  projectId: requiredEnvVars.projectId!,
  storageBucket: requiredEnvVars.storageBucket!,
  messagingSenderId: requiredEnvVars.messagingSenderId!,
  appId: requiredEnvVars.appId!,
};

// Debug: Log Firebase config (temporary - remove after debugging)
console.log('=== FIREBASE INITIALIZATION ===');
console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...' // Only show first 10 chars
});

// Check if Firebase app is already initialized (handles hot reload)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
console.log('✓ Firebase app initialized:', app.name);

// Initialize auth with React Native AsyncStorage persistence
// Use getAuth if already initialized (handles hot reload)
let auth: Auth;
try {
  auth = getAuth(app);
  console.log('✓ Using existing Firebase Auth instance');
} catch {
  // @ts-ignore - getReactNativePersistence exists at runtime but not in TS definitions (Firebase 12 issue)
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('✓ Firebase Auth initialized with persistence');
}
export { auth };
console.log('Auth config check:', {
  apiKey: auth.config.apiKey?.substring(0, 10) + '...',
  authDomain: auth.config.authDomain,
});

export const db = getFirestore(app);
export const storage = getStorage(app);
console.log('✓ Firestore and Storage initialized');
console.log('=================================');
