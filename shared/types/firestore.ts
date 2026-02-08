export interface Couple {
  createdAt: Date;
  memberIds: string[];
  memberNames: Record<string, string>;
}

export interface User {
  email: string;
  name: string;
  coupleId: string;
  fcmToken?: string;
  photoUrl?: string;
  createdAt: Date;
  settings: UserSettings;
}

export interface UserSettings {
  morningCheckInTime: string; // "HH:mm" format
  eveningReminderTime: string; // "HH:mm" format
  wifiOnlySync: boolean;
}

export type MarshmallowType = 'custom' | 'quick-pick' | 'photo';

export interface Marshmallow {
  coupleId: string;
  senderId: string;
  recipientId: string;
  message: string;
  type: MarshmallowType;
  photoUrl?: string;
  quickPickId?: string;
  createdAt: Date;
  read: boolean;
}

export type MoodType = 'happy' | 'loving' | 'stressed' | 'excited' | 'peaceful' | 'down';

export interface DailyCheckin {
  coupleId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  mood: MoodType;
  moodNote?: string;
  gratitude: string;
  createdAt: Date;
}

export type MemorySource = 'manual' | 'suggested' | 'device';

export interface Memory {
  coupleId: string;
  createdBy: string;
  title: string;
  description: string;
  photoUrls: string[];
  devicePhotoUris: string[];
  tags: string[];
  date: Date;
  source: MemorySource;
  createdAt: Date;
}

export type QuickPickCategory = 'sweet' | 'playful' | 'loving';

export interface QuickPick {
  message: string;
  emoji: string;
  category: QuickPickCategory;
}
