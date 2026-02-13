// Firestore Timestamp type for documents
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

export interface Couple {
  createdAt: FirestoreTimestamp;
  memberIds: [string, string]; // Tuple for exactly two members
  memberNames: Record<string, string>;
}

export interface User {
  email: string;
  name: string;
  coupleId: string;
  fcmToken?: string;
  photoUrl?: string;
  createdAt: FirestoreTimestamp;
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
  createdAt: FirestoreTimestamp;
  read: boolean;
}

// Predefined mood types (can also be any custom string)
export type PredefinedMoodType = 'happy' | 'loving' | 'stressed' | 'excited' | 'peaceful' | 'down';
export type MoodType = PredefinedMoodType | string;

export interface DailyCheckin {
  coupleId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  mood: MoodType;
  moodNote?: string;
  gratitude: string;
  createdAt: FirestoreTimestamp;
}

export type MemorySource = 'manual' | 'suggested' | 'device';

export interface Memory {
  coupleId: string;
  createdBy: string;
  title: string;
  description: string;
  photoUrls: string[];
  videoUrls?: string[];
  devicePhotoUris: string[];
  deviceVideoUris?: string[];
  tags: string[];
  date: FirestoreTimestamp;
  source: MemorySource;
  createdAt: FirestoreTimestamp;
}

// Utility type to add Firestore document ID to a type
export type WithId<T> = T & { id: string };

export type QuickPickCategory = 'sweet' | 'playful' | 'loving';
