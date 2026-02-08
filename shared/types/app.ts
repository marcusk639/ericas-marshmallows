import { MoodType, QuickPickCategory } from './firestore';

// Type definition for couple configuration (to be populated by environment config)
export type CoupleConfig = {
  coupleId: string;
  members: {
    [email: string]: {
      name: string;
      role: 'partner1' | 'partner2';
    };
  };
};

export interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  { type: 'happy', emoji: '😊', label: 'Happy' },
  { type: 'loving', emoji: '💕', label: 'Loving' },
  { type: 'stressed', emoji: '😰', label: 'Stressed' },
  { type: 'excited', emoji: '✨', label: 'Excited' },
  { type: 'peaceful', emoji: '😌', label: 'Peaceful' },
  { type: 'down', emoji: '😔', label: 'Down' },
];

export interface QuickPick {
  message: string;
  emoji: string;
  category: QuickPickCategory;
}

export const DEFAULT_QUICK_PICKS: QuickPick[] = [
  { message: 'Thinking of you', emoji: '💭', category: 'sweet' as const },
  { message: 'I love you', emoji: '❤️', category: 'loving' as const },
  { message: 'Miss you', emoji: '🥺', category: 'sweet' as const },
  { message: 'You\'re amazing', emoji: '✨', category: 'loving' as const },
  { message: 'Can\'t wait to see you', emoji: '😍', category: 'playful' as const },
];
