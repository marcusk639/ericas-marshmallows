import { useState, useEffect, useCallback } from 'react';
import type { Marshmallow, MarshmallowType, WithId } from '../../../shared/types';
import {
  sendMarshmallow as sendMarshmallowService,
  subscribeToCoupleMarshmallows,
  markMarshmallowAsRead as markMarshmallowAsReadService,
} from '../services/marshmallows';

interface UseMarshmallowsResult {
  marshmallows: WithId<Marshmallow>[];
  loading: boolean;
  error: Error | null;
  markAsRead: (marshmallowId: string) => Promise<void>;
}

/**
 * Hook to subscribe to marshmallows for a couple
 * Provides real-time updates when marshmallows are added or modified
 */
export const useMarshmallows = (coupleId: string | null): UseMarshmallowsResult => {
  const [marshmallows, setMarshmallows] = useState<WithId<Marshmallow>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useMarshmallows: coupleId changed to:', coupleId);

    if (!coupleId) {
      console.log('useMarshmallows: No coupleId, clearing marshmallows');
      setMarshmallows([]);
      setLoading(false);
      return;
    }

    console.log('useMarshmallows: Setting up subscription for coupleId:', coupleId);
    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToCoupleMarshmallows(
      coupleId,
      (newMarshmallows) => {
        console.log('useMarshmallows: Received marshmallows update:', newMarshmallows.length);
        console.log('useMarshmallows: Marshmallow data:', JSON.stringify(newMarshmallows, null, 2));
        setMarshmallows(newMarshmallows);
        console.log('useMarshmallows: State updated, calling setLoading(false)');
        setLoading(false);
      },
      (err) => {
        console.error('useMarshmallows: Subscription error:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      console.log('useMarshmallows: Cleaning up subscription');
      unsubscribe();
    };
  }, [coupleId]);

  const markAsRead = useCallback(async (marshmallowId: string) => {
    try {
      await markMarshmallowAsReadService(marshmallowId);
    } catch (err) {
      console.error('Error marking marshmallow as read:', err);
      setError(err instanceof Error ? err : new Error('Failed to mark marshmallow as read'));
    }
  }, []);

  return { marshmallows, loading, error, markAsRead };
};

interface UseSendMarshmallowResult {
  sendMarshmallow: (
    recipientId: string,
    message: string,
    type: MarshmallowType,
    options?: {
      photoUrl?: string;
      quickPickId?: string;
    }
  ) => Promise<void>;
  sending: boolean;
  error: Error | null;
}

/**
 * Hook to send marshmallows
 * Provides sending state and error handling
 */
export const useSendMarshmallow = (
  coupleId: string | null,
  senderId: string | null
): UseSendMarshmallowResult => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMarshmallow = useCallback(
    async (
      recipientId: string,
      message: string,
      type: MarshmallowType,
      options?: {
        photoUrl?: string;
        quickPickId?: string;
      }
    ) => {
      if (!coupleId || !senderId) {
        const err = new Error('User must be signed in to send marshmallows');
        setError(err);
        throw err;
      }

      setSending(true);
      setError(null);

      try {
        await sendMarshmallowService(
          coupleId,
          senderId,
          recipientId,
          message,
          type,
          options
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to send marshmallow');
        setError(error);
        throw error;
      } finally {
        setSending(false);
      }
    },
    [coupleId, senderId]
  );

  return { sendMarshmallow, sending, error };
};
