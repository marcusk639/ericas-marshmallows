#!/usr/bin/env ts-node
/**
 * Boolean Type Migration Script
 *
 * Fixes boolean fields that were incorrectly stored as strings in Firestore.
 * This script:
 * 1. Fixes `settings.wifiOnlySync` in user documents (string -> boolean)
 * 2. Fixes `read` field in marshmallow documents (string -> boolean)
 *
 * Usage:
 *   npm run fix-booleans
 *   or
 *   ts-node fix-boolean-types.ts
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
const serviceAccount = require("../shared/firebase-private-key.json");
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "erica-s-marshmallows.firebasestorage.app",
});

const db = getFirestore();

interface MigrationStats {
  usersChecked: number;
  usersFixed: number;
  marshmallowsChecked: number;
  marshmallowsFixed: number;
}

/**
 * Convert string boolean to actual boolean
 */
function stringToBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}

/**
 * Fix wifiOnlySync in user documents
 */
async function fixUserBooleans(): Promise<{ checked: number; fixed: number }> {
  console.log('\n🔍 Checking users collection...');

  const usersSnapshot = await db.collection('users').get();
  let checked = 0;
  let fixed = 0;

  for (const doc of usersSnapshot.docs) {
    checked++;
    const data = doc.data();

    // Check if settings.wifiOnlySync is a string
    if (data.settings && typeof data.settings.wifiOnlySync === 'string') {
      console.log(`  ⚠️  User ${doc.id}: wifiOnlySync is string "${data.settings.wifiOnlySync}"`);

      const boolValue = stringToBoolean(data.settings.wifiOnlySync);
      await doc.ref.update({
        'settings.wifiOnlySync': boolValue,
      });

      console.log(`  ✅ Fixed: wifiOnlySync -> ${boolValue}`);
      fixed++;
    } else if (data.settings && typeof data.settings.wifiOnlySync === 'boolean') {
      console.log(`  ✓ User ${doc.id}: wifiOnlySync is already boolean (${data.settings.wifiOnlySync})`);
    } else {
      console.log(`  ⚠️  User ${doc.id}: wifiOnlySync is missing or undefined`);
    }
  }

  return { checked, fixed };
}

/**
 * Fix read field in marshmallow documents
 */
async function fixMarshmallowBooleans(): Promise<{ checked: number; fixed: number }> {
  console.log('\n🔍 Checking marshmallows collection...');

  const marshmallowsSnapshot = await db.collection('marshmallows').get();
  let checked = 0;
  let fixed = 0;

  for (const doc of marshmallowsSnapshot.docs) {
    checked++;
    const data = doc.data();

    // Check if read is a string
    if (typeof data.read === 'string') {
      console.log(`  ⚠️  Marshmallow ${doc.id}: read is string "${data.read}"`);

      const boolValue = stringToBoolean(data.read);
      await doc.ref.update({
        read: boolValue,
      });

      console.log(`  ✅ Fixed: read -> ${boolValue}`);
      fixed++;
    }
  }

  if (fixed === 0) {
    console.log('  ✓ All marshmallows have correct boolean types');
  }

  return { checked, fixed };
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting Boolean Type Migration');
  console.log('===================================\n');

  const stats: MigrationStats = {
    usersChecked: 0,
    usersFixed: 0,
    marshmallowsChecked: 0,
    marshmallowsFixed: 0,
  };

  try {
    // Fix users
    const userResults = await fixUserBooleans();
    stats.usersChecked = userResults.checked;
    stats.usersFixed = userResults.fixed;

    // Fix marshmallows
    const marshmallowResults = await fixMarshmallowBooleans();
    stats.marshmallowsChecked = marshmallowResults.checked;
    stats.marshmallowsFixed = marshmallowResults.fixed;

    // Print summary
    console.log('\n===================================');
    console.log('📊 Migration Summary');
    console.log('===================================');
    console.log(`Users checked: ${stats.usersChecked}`);
    console.log(`Users fixed: ${stats.usersFixed}`);
    console.log(`Marshmallows checked: ${stats.marshmallowsChecked}`);
    console.log(`Marshmallows fixed: ${stats.marshmallowsFixed}`);
    console.log('\n✅ Migration complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
