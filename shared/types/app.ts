import { MoodType } from './firestore';

export const COUPLE_CONFIG = {
  coupleId: 'marcus-erica',
  members: {
    'marcusk639@gmail.com': {
      name: 'Marcus',
      role: 'partner1' as const,
    },
    'ericajure@gmail.com': {
      name: 'Erica',
      role: 'partner2' as const,
    },
  },
} as const;

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

export const DEFAULT_QUICK_PICKS = [
  { message: 'Thinking of you', emoji: '💭', category: 'sweet' as const },
  { message: 'I love you', emoji: '❤️', category: 'loving' as const },
  { message: 'Miss you', emoji: '🥺', category: 'sweet' as const },
  { message: 'You\'re amazing', emoji: '✨', category: 'loving' as const },
  { message: 'Can\'t wait to see you', emoji: '😍', category: 'playful' as const },
];
