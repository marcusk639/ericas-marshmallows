/**
 * Cloud Functions for Firebase
 *
 * This file will contain all Firebase Cloud Functions for the Erica's Marshmallows app.
 * Functions will be added as the application is developed.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Placeholder function - to be implemented
export const helloWorld = functions.https.onRequest((request, response) => {
  response.json({ message: 'Hello from Firebase!' });
});
