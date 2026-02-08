# Erica's Marshmallows - Design Document

**Date:** February 7, 2026
**App Purpose:** Valentine's Day gift app for Marcus and Erica to show love for each other
**App Name:** Erica's Marshmallows (from inside joke/pet name)

## Overview

A React Native mobile app that enables Marcus and Erica to stay connected through quick love notes ("marshmallows"), shared memories, and daily emotional check-ins. Built for the two of them initially, but architected to support other couples in the future.

## Tech Stack

- **Mobile:** React Native with Expo (TypeScript)
- **Backend:** Firebase
  - Firestore (real-time database)
  - Firebase Storage (photos)
  - Firebase Auth (Google Sign-In)
  - Firebase Cloud Messaging (push notifications)
  - Cloud Functions (minimal - notifications and validation)
- **Development:** Expo for live reload and EAS Build for distribution

## Core Features

### 1. Marshmallows (Love Notes)

Quick and expressive messages to show love throughout the day.

**Types:**
- **Custom Message:** Freeform text with optional photo
- **Quick Picks:** Pre-written options ("Thinking of you 💭", "I love you ❤️", "Miss you", etc.)
- **Photo Marshmallow:** Send photo with optional caption

**Experience:**
- Floating "+" button to send
- Conversation-style view (yours on right, partner's on left)
- Push notification on receive: "Marcus sent you a marshmallow 🤍"
- Badge count for unread
- Can reply directly from a marshmallow
- Mark as read when opened

**Technical:**
- Cloud Function triggers push notification on new marshmallow
- Real-time Firestore listeners for instant delivery

### 2. Daily Check-In (Mood + Gratitude)

Two-part daily ritual for emotional connection and appreciation.

**Part 1: Mood Sharing**
- Simple emoji picker: 😊 Happy, 💕 Loving, 😰 Stressed, ✨ Excited, 😌 Peaceful, 😔 Down
- One-tap selection
- Optional brief note (5-10 words)
- See partner's mood immediately after submitting

**Part 2: Gratitude Exchange**
- Prompt: "What do you appreciate about [Partner] today?"
- Text input (short and sweet)
- Can't see partner's gratitude until you submit yours
- Both gratitudes revealed after both submit

**Flow:**
1. Morning notification (8am default, customizable): "Good morning! Check in with Erica ☀️"
2. Complete mood + gratitude
3. Notification when partner completes: "Erica checked in for today 💕"
4. Evening reminder if incomplete (8pm, optional)

**History & Tracking:**
- Calendar view of past check-ins
- Mood trends graph
- Archive of past gratitudes (searchable)
- Streak tracking with milestone celebrations (7, 30, 100 days)

### 3. Memory Collection

Shared timeline of photos and moments, with smart auto-sync from device photos.

**Auto-Sync Strategy:**
- **Initial sync:** Last 6 months of device/iCloud photos
- **Smart filtering:**
  - Only photos with 2+ faces detected
  - Exclude screenshots, duplicates, low-quality images
  - Photos from shared locations
  - Favorited photos
- **User review:** Preview grid before syncing, can deselect unwanted photos
- **Ongoing sync:** Daily background check for new photos
- **Optimization:** Compress/resize before upload, WiFi-only option
- **Metadata extraction:** EXIF data for date/location, auto-tags

**Viewing Modes:**
1. **Timeline View:** Vertical feed, newest first, infinite scroll
2. **Random Memory:** "Show me a memory" button (or shake phone) - surfaces random past memory
3. **Tag Browser:** Filter by tags (#vacation, #date-night, #anniversary)
4. **Calendar View:** Month picker, see which days have memories, "On This Day" feature
5. **Search:** By title, description, tags, date range

**Adding Memories:**
- From auto-sync suggestions
- Manually from camera roll
- Take photo → add immediately
- Edit title, description, tags, date
- Multiple photos per memory

**Data Structure:**
```
memories/{memoryId}
  - coupleId
  - createdBy
  - title
  - description
  - photoUrls: [] (Firebase Storage)
  - devicePhotoUris: [] (local/iCloud references)
  - tags: []
  - date (when memory happened)
  - source: "manual" | "suggested" | "device"
  - createdAt
```

## Notifications Strategy

Push notifications for all activity to stay connected:

**Marshmallows:**
- New marshmallow received (immediate)
- Badge count for unread

**Daily Check-In:**
- Morning reminder (8am customizable)
- Partner completed (immediate)
- Evening nudge if incomplete (8pm, optional)

**Memories:**
- New memory added by partner
- Weekly sync digest: "Found 8 new photos this week"
- "On This Day" reminder (morning)

**Milestones:**
- Streak achievements (7, 30, 100 days)
- Memory count milestones (100, 500 memories)

**Implementation:**
- Firebase Cloud Messaging
- Cloud Functions trigger on Firestore writes
- FCM tokens stored in user profile

## Authentication & User Management

**Google Sign-In with Auto-Detection:**

Hardcoded email mapping for Marcus and Erica:
- `marcusk639@gmail.com` → Marcus
- `ericajure@gmail.com` → Erica

**First Sign-In Flow:**
1. User taps "Sign in with Google"
2. Google auth completes
3. Check email against hardcoded list
4. Auto-create user profile with correct name and link to `coupleId`
5. If email doesn't match → error message (for now)

**User Profile:**
```
users/{userId}
  - email
  - name (auto-detected: "Marcus" or "Erica")
  - coupleId: "marcus-erica"
  - fcmToken (for notifications)
  - photoUrl (from Google)
  - createdAt
  - settings:
    - morningCheckInTime: "08:00"
    - eveningReminderTime: "20:00"
    - wifiOnlySync: true
```

**Future Expansion:**
When ready for other couples, replace hardcoded emails with invite code pairing flow.

## Data Model

### Firestore Collections

**couples/{coupleId}**
```
- createdAt
- memberIds: [userId1, userId2]
- memberNames: {userId1: "Marcus", userId2: "Erica"}
```

**users/{userId}**
```
- email
- name
- coupleId
- fcmToken
- photoUrl
- createdAt
- settings: {...}
```

**marshmallows/{marshmallowId}**
```
- coupleId
- senderId
- recipientId
- message
- type: "custom" | "quick-pick" | "photo"
- photoUrl (optional)
- quickPickId (optional)
- createdAt
- read: boolean
```

**memories/{memoryId}**
```
- coupleId
- createdBy
- title
- description
- photoUrls: []
- devicePhotoUris: []
- tags: []
- date
- source: "manual" | "suggested" | "device"
- createdAt
```

**dailyCheckins/{checkinId}**
```
- coupleId
- userId
- date (YYYY-MM-DD)
- mood: "happy" | "loving" | "stressed" | "excited" | "peaceful" | "down"
- moodNote (optional, brief text)
- gratitude (text about partner)
- createdAt
```

**quickPicks/{pickId}**
```
- message
- emoji
- category: "sweet" | "playful" | "loving"
```

### Security Rules

- Users can only read/write data for their own couple
- Both partners have equal access to all couple data
- No cross-couple data access

## Monorepo Structure

```
ericas-marshmallows/
├── mobile/              # React Native (Expo) app
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── screens/     # Screen components
│   │   ├── services/    # Firebase SDK wrappers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── types/       # TypeScript types
│   │   └── config/      # Firebase config, couple config
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── functions/           # Firebase Cloud Functions
│   ├── src/
│   │   ├── notifications.ts  # Notification triggers
│   │   ├── triggers.ts       # Firestore triggers
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── firebase/            # Firebase config & rules
│   ├── firestore.rules
│   ├── storage.rules
│   └── firebase.json
│
├── docs/               # Design docs, plans
└── shared/            # Shared TypeScript types
    └── types/         # Data models shared between mobile/functions
```

## Development Setup

**Tools:**
- Expo CLI for React Native development
- Firebase CLI for backend deployment
- TypeScript throughout for type safety
- ESLint + Prettier for code quality

**Local Development:**
1. Mobile app with Expo Go (live reload on phone)
2. Firebase Emulators for local testing (Firestore, Functions, Auth)
3. Hot reload for rapid iteration

**Testing:**
- Jest for Cloud Functions
- React Native Testing Library for mobile components
- Manual testing via TestFlight

## Deployment

**Mobile App:**
- Expo EAS Build for iOS builds
- TestFlight for beta testing with Marcus & Erica
- App Store submission when ready

**Backend:**
- `firebase deploy --only functions` for Cloud Functions
- `firebase deploy --only firestore:rules,storage:rules` for security rules

**Workflow:**
1. Develop locally with emulators
2. Test on device with Expo Go
3. Deploy functions to Firebase staging
4. Build and distribute via TestFlight
5. Iterate based on usage

## Cost Estimates

**Firebase (2 users):**
- **Firestore:** Likely free (generous free tier)
- **Storage:** <1GB = free
- **Functions:** Minimal invocations = free tier
- **Auth:** Free
- **Cloud Messaging:** Free

**Expo:**
- Free tier sufficient for development
- EAS Build: Free tier for small projects

**Expected:** $0/month on free tiers for 2 users

## Future Expansion Ideas

When ready to support other couples:
- Remove hardcoded email detection
- Add invite code pairing flow
- Multi-couple support in data model (already designed for this)
- Public app store listing
- Consider premium features (unlimited storage, advanced features)

## Success Metrics

**Engagement:**
- Daily check-in completion rate
- Marshmallows sent per week
- Memories added per month
- Streak length

**Quality of Life:**
- App feels personal and special
- Low friction (quick interactions)
- Helps Marcus and Erica feel connected
- Becomes a daily habit

## Timeline

1. **Week 1-2:** Scaffold monorepo, setup Firebase, basic auth
2. **Week 3-4:** Implement marshmallows feature
3. **Week 5-6:** Implement daily check-in feature
4. **Week 7-8:** Implement memory collection (manual add first)
5. **Week 9-10:** Add auto-sync and smart photo features
6. **Week 11-12:** Polish UI, notifications, testing
7. **Week 13+:** TestFlight beta, iterate based on usage

---

**Next Steps:**
1. Create implementation plan
2. Set up git worktree for isolated development
3. Scaffold monorepo structure
4. Initialize Firebase project
5. Begin feature implementation
