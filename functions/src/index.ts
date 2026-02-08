/**
 * Cloud Functions for Firebase - Erica's Marshmallows
 *
 * Handles push notifications for:
 * - New marshmallows sent
 * - Daily check-ins completed
 * - New memories added
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Send push notification when a new marshmallow is created
 * Triggers: onCreate for marshmallows collection
 */
export const onMarshmallowCreated = functions.firestore
  .document('marshmallows/{marshmallowId}')
  .onCreate(async (snapshot, context) => {
    try {
      const marshmallow = snapshot.data();
      const recipientId = marshmallow.recipientId;

      // Get recipient's FCM token
      const userDoc = await db.collection('users').doc(recipientId).get();
      if (!userDoc.exists) {
        console.log(`User ${recipientId} not found`);
        return null;
      }

      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) {
        console.log(`No FCM token for user ${recipientId}`);
        return null;
      }

      // Get sender's name
      const senderDoc = await db.collection('users').doc(marshmallow.senderId).get();
      const senderName = senderDoc.data()?.name || 'Someone';

      // Send notification
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: `${senderName} sent you a marshmallow 🤍`,
          body: marshmallow.message.substring(0, 100),
        },
        data: {
          type: 'marshmallow',
          marshmallowId: context.params.marshmallowId,
          senderId: marshmallow.senderId,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      await messaging.send(message);
      console.log(`Notification sent to ${recipientId} for marshmallow ${context.params.marshmallowId}`);
      return null;
    } catch (error) {
      console.error('Error sending marshmallow notification:', error);
      throw error;
    }
  });

/**
 * Send push notification when partner completes daily check-in
 * Triggers: onCreate for dailyCheckins collection
 */
export const onCheckinCreated = functions.firestore
  .document('dailyCheckins/{checkinId}')
  .onCreate(async (snapshot, context) => {
    try {
      const checkin = snapshot.data();
      const userId = checkin.userId;
      const coupleId = checkin.coupleId;

      // Get couple data to find partner
      const coupleDoc = await db.collection('couples').doc(coupleId).get();
      if (!coupleDoc.exists) {
        console.log(`Couple ${coupleId} not found`);
        return null;
      }

      const memberIds = coupleDoc.data()?.memberIds || [];
      const partnerId = memberIds.find((id: string) => id !== userId);
      if (!partnerId) {
        console.log('Partner not found for couple');
        return null;
      }

      // Get partner's FCM token
      const partnerDoc = await db.collection('users').doc(partnerId).get();
      if (!partnerDoc.exists || !partnerDoc.data()?.fcmToken) {
        console.log(`No FCM token for partner ${partnerId}`);
        return null;
      }

      const fcmToken = partnerDoc.data()!.fcmToken;

      // Get user's name
      const userDoc = await db.collection('users').doc(userId).get();
      const userName = userDoc.data()?.name || 'Your partner';

      // Send notification
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: `${userName} checked in for today 💕`,
          body: `See how they're feeling`,
        },
        data: {
          type: 'checkin',
          checkinId: context.params.checkinId,
          userId: userId,
          date: checkin.date,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      await messaging.send(message);
      console.log(`Check-in notification sent to ${partnerId}`);
      return null;
    } catch (error) {
      console.error('Error sending check-in notification:', error);
      throw error;
    }
  });

/**
 * Send push notification when a new memory is created
 * Triggers: onCreate for memories collection
 */
export const onMemoryCreated = functions.firestore
  .document('memories/{memoryId}')
  .onCreate(async (snapshot, context) => {
    try {
      const memory = snapshot.data();
      const creatorId = memory.createdBy;
      const coupleId = memory.coupleId;

      // Get couple data to find partner
      const coupleDoc = await db.collection('couples').doc(coupleId).get();
      if (!coupleDoc.exists) {
        console.log(`Couple ${coupleId} not found`);
        return null;
      }

      const memberIds = coupleDoc.data()?.memberIds || [];
      const partnerId = memberIds.find((id: string) => id !== creatorId);
      if (!partnerId) {
        console.log('Partner not found for couple');
        return null;
      }

      // Get partner's FCM token
      const partnerDoc = await db.collection('users').doc(partnerId).get();
      if (!partnerDoc.exists || !partnerDoc.data()?.fcmToken) {
        console.log(`No FCM token for partner ${partnerId}`);
        return null;
      }

      const fcmToken = partnerDoc.data()!.fcmToken;

      // Get creator's name
      const creatorDoc = await db.collection('users').doc(creatorId).get();
      const creatorName = creatorDoc.data()?.name || 'Your partner';

      // Send notification
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: `${creatorName} added a new memory 📸`,
          body: memory.title,
        },
        data: {
          type: 'memory',
          memoryId: context.params.memoryId,
          creatorId: creatorId,
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      await messaging.send(message);
      console.log(`Memory notification sent to ${partnerId}`);
      return null;
    } catch (error) {
      console.error('Error sending memory notification:', error);
      throw error;
    }
  });

/**
 * Update user's FCM token
 * HTTP endpoint for mobile app to register/update FCM tokens
 */
export const updateFCMToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const userId = context.auth.uid;
  const fcmToken = data.fcmToken;

  if (!fcmToken) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'FCM token is required'
    );
  }

  try {
    await db.collection('users').doc(userId).update({
      fcmToken: fcmToken,
      fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`FCM token updated for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating FCM token:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update FCM token');
  }
});
