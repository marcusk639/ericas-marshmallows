import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Marshmallow, MarshmallowType, WithId } from '../../../shared/types';

/**
 * Send a marshmallow to the partner
 */
export const sendMarshmallow = async (
  coupleId: string,
  senderId: string,
  recipientId: string,
  message: string,
  type: MarshmallowType,
  options?: {
    photoUrl?: string;
    quickPickId?: string;
  }
): Promise<string> => {
  console.log('sendMarshmallow called with:', {
    coupleId,
    senderId,
    recipientId,
    message: message.substring(0, 50),
    type,
    options,
  });

  try {
    const marshmallowData: any = {
      coupleId,
      senderId,
      recipientId,
      message,
      type,
      createdAt: serverTimestamp(),
      read: Boolean(false),
    };

    // Only include optional fields if they have values
    if (options?.photoUrl) {
      marshmallowData.photoUrl = options.photoUrl;
    }
    if (options?.quickPickId) {
      marshmallowData.quickPickId = options.quickPickId;
    }

    console.log('Attempting to add marshmallow document...');
    const docRef = await addDoc(collection(db, 'marshmallows'), marshmallowData);
    console.log('✅ Successfully sent marshmallow:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error sending marshmallow:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
    });
    throw new Error('Failed to send marshmallow. Please try again.');
  }
};

/**
 * Subscribe to marshmallows for a couple
 * Returns real-time updates when marshmallows are added or modified
 */
export const subscribeToCoupleMarshmallows = (
  coupleId: string,
  callback: (marshmallows: WithId<Marshmallow>[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  try {
    const q = query(
      collection(db, 'marshmallows'),
      where('coupleId', '==', coupleId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const marshmallows: WithId<Marshmallow>[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            coupleId: data.coupleId,
            senderId: data.senderId,
            recipientId: data.recipientId,
            message: data.message,
            type: data.type,
            photoUrl: data.photoUrl,
            quickPickId: data.quickPickId,
            createdAt: data.createdAt
              ? {
                  seconds: (data.createdAt as Timestamp).seconds,
                  nanoseconds: (data.createdAt as Timestamp).nanoseconds,
                }
              : { seconds: 0, nanoseconds: 0 },
            read: Boolean(data.read),
          };
        });
        callback(marshmallows);
      },
      (error) => {
        console.error('Error in marshmallows subscription:', error);
        if (onError) {
          onError(new Error('Failed to load marshmallows. Please try again.'));
        }
      }
    );
  } catch (error) {
    console.error('Error setting up marshmallows subscription:', error);
    throw new Error('Failed to subscribe to marshmallows. Please try again.');
  }
};

/**
 * Mark a marshmallow as read
 */
export const markMarshmallowAsRead = async (marshmallowId: string): Promise<void> => {
  try {
    const marshmallowRef = doc(db, 'marshmallows', marshmallowId);
    await updateDoc(marshmallowRef, {
      read: Boolean(true),
    });
    console.log('Successfully marked marshmallow as read:', marshmallowId);
  } catch (error) {
    console.error('Error marking marshmallow as read:', error);
    throw new Error('Failed to mark marshmallow as read. Please try again.');
  }
};
