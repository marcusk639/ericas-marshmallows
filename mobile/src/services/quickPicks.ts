import { collection, query, orderBy, getDocs, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { QuickPick, WithId } from '../../../shared/types';

/**
 * Get all quick pick messages from Firestore
 * Ordered by 'order' field for consistent display
 */
export async function getQuickPicks(): Promise<WithId<QuickPick>[]> {
  try {
    const q = query(
      collection(db, 'quickPicks'),
      orderBy('order', 'asc')
    );

    const snapshot: QuerySnapshot<DocumentData> = await getDocs(q);

    const quickPicks: WithId<QuickPick>[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      message: doc.data().message,
      emoji: doc.data().emoji,
      category: doc.data().category,
    }));

    return quickPicks;
  } catch (error) {
    console.error('Error fetching quick picks:', error);
    throw new Error('Failed to load quick picks. Please try again.');
  }
}

/**
 * Get quick picks by category
 */
export async function getQuickPicksByCategory(category: string): Promise<WithId<QuickPick>[]> {
  try {
    const allPicks = await getQuickPicks();
    return allPicks.filter((pick) => pick.category === category);
  } catch (error) {
    console.error('Error fetching quick picks by category:', error);
    throw new Error('Failed to load quick picks. Please try again.');
  }
}
