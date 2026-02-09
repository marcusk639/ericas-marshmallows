#!/usr/bin/env tsx
/**
 * Clean up test data from Firestore
 * Run with: npx tsx scripts/cleanup-test-data.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // Delete all users
    console.log('Deleting users collection...');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnapshot.docs) {
      console.log(`  - Deleting user: ${userDoc.id} (${userDoc.data().email})`);
      await deleteDoc(doc(db, 'users', userDoc.id));
    }
    console.log(`✅ Deleted ${usersSnapshot.size} user(s)\n`);

    // Delete couple document
    console.log('Deleting couples collection...');
    const couplesSnapshot = await getDocs(collection(db, 'couples'));
    for (const coupleDoc of couplesSnapshot.docs) {
      console.log(`  - Deleting couple: ${coupleDoc.id}`);
      await deleteDoc(doc(db, 'couples', coupleDoc.id));
    }
    console.log(`✅ Deleted ${couplesSnapshot.size} couple(s)\n`);

    // Delete daily check-ins
    console.log('Deleting dailyCheckins collection...');
    const checkinsSnapshot = await getDocs(collection(db, 'dailyCheckins'));
    for (const checkinDoc of checkinsSnapshot.docs) {
      await deleteDoc(doc(db, 'dailyCheckins', checkinDoc.id));
    }
    console.log(`✅ Deleted ${checkinsSnapshot.size} check-in(s)\n`);

    console.log('✨ Cleanup complete! You can now sign in with a fresh account.');
    console.log('\nNote: You still need to delete users from Firebase Auth Console:');
    console.log('https://console.firebase.google.com/project/erica-s-marshmallows/authentication/users');
  } catch (error) {
    console.error('❌ Error cleaning up:', error);
  }

  process.exit(0);
}

cleanupTestData();
