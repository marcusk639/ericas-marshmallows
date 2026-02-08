import { useState, useEffect } from 'react';
import { getQuickPicks } from '../services/quickPicks';
import type { QuickPick, WithId } from '../../../shared/types';

interface UseQuickPicksResult {
  quickPicks: WithId<QuickPick>[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to load quick pick messages from Firestore
 */
export function useQuickPicks(): UseQuickPicksResult {
  const [quickPicks, setQuickPicks] = useState<WithId<QuickPick>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadQuickPicks = async () => {
    try {
      setLoading(true);
      setError(null);
      const picks = await getQuickPicks();
      setQuickPicks(picks);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load quick picks'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuickPicks();
  }, []);

  return {
    quickPicks,
    loading,
    error,
    refresh: loadQuickPicks,
  };
}
