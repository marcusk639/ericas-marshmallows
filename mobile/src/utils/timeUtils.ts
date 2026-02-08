import type { FirestoreTimestamp } from '../../../shared/types';

/**
 * Convert Firestore timestamp to friendly relative time
 * e.g., "Just now", "5m ago", "2h ago", "Yesterday", "Jan 5"
 */
export const getTimeAgo = (timestamp: FirestoreTimestamp): string => {
  const now = Date.now();
  const messageTime = timestamp.seconds * 1000;
  const diff = now - messageTime;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    // Format as "Jan 5" or "Jan 5, 2025" if different year
    const date = new Date(messageTime);
    const currentYear = new Date().getFullYear();
    const messageYear = date.getFullYear();

    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();

    if (messageYear === currentYear) {
      return `${month} ${day}`;
    } else {
      return `${month} ${day}, ${messageYear}`;
    }
  }
};
