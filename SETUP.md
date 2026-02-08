# 🚀 Erica's Marshmallows - Setup Guide

Complete guide to set up the app for you and your wife.

## 📋 Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Google account for Firebase
- [ ] Gmail accounts for both partners
- [ ] Expo account (optional, for push notifications)

---

## 1️⃣ Firebase Project Setup

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name: `ericas-marshmallows` (or your choice)
4. Follow the prompts to create the project

### Enable Firebase Services

**Authentication:**
1. Go to Authentication → Sign-in method
2. Enable "Google" provider
3. Save

**Firestore Database:**
1. Go to Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select a location close to you

**Storage:**
1. Go to Storage
2. Click "Get started"
3. Use default security rules for now

**Cloud Functions:**
1. Go to Functions
2. Click "Get started"
3. Upgrade to Blaze plan (pay-as-you-go, needed for functions)
4. Note: Free tier includes 2M invocations/month

**Cloud Messaging:**
- Automatically enabled when you set up notifications

---

## 2️⃣ Get Firebase Configuration Values

### Method 1: Register an iOS App (Recommended)

1. In Firebase Console, click ⚙️ → Project settings
2. Scroll to "Your apps" section
3. Click "Add app" → iOS
4. Bundle ID: `com.yourcompany.ericasmarshmallows`
5. App nickname: `Erica's Marshmallows`
6. Download `GoogleService-Info.plist`
7. Place it in `/mobile/GoogleService-Info.plist`

### Method 2: Register a Web App (Alternative)

1. Click "Add app" → Web
2. App nickname: `Erica's Marshmallows Web`
3. Copy the Firebase SDK configuration values

### Copy Firebase Config Values

From the Firebase SDK configuration snippet, copy these values:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",           // → EXPO_PUBLIC_FIREBASE_API_KEY
  authDomain: "project.firebaseapp.com", // → EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "your-project-id", // → EXPO_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "project.appspot.com", // → EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123...",  // → EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123..."            // → EXPO_PUBLIC_FIREBASE_APP_ID
};
```

---

## 3️⃣ Get Google Web Client ID

### Method 1: Firebase Console (Easiest)

1. Go to Authentication → Sign-in method
2. Click on "Google" provider
3. Expand "Web SDK configuration"
4. Copy the "Web client ID"

### Method 2: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to "APIs & Services" → "Credentials"
4. Find "Web client (auto created by Google Service)"
5. Copy the Client ID

**Format check:** Should end with `.apps.googleusercontent.com`

---

## 4️⃣ Create .env File

```bash
cd /Users/marcusklein/dev/ericas-marshmallows/mobile
cp .env.example .env
```

Edit `.env` and fill in all values:

```bash
# Firebase values from step 2
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=ericas-marshmallows
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:ios:abc...

# Web Client ID from step 3
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=989971240553-5v2n0fhrj7pecum0r26o2e4fjvslkoq1.apps.googleusercontent.com

# Your Gmail addresses (already filled in)
EXPO_PUBLIC_PARTNER1_EMAIL=marcusk639@gmail.com
EXPO_PUBLIC_PARTNER2_EMAIL=ericajure@gmail.com

# Optional: Expo Project ID (can add later)
EXPO_PUBLIC_PROJECT_ID=
```

**⚠️ Important:** Never commit the `.env` file to git!

---

## 5️⃣ Deploy Firestore Rules & Functions

### Deploy Security Rules

```bash
cd /Users/marcusklein/dev/ericas-marshmallows
firebase login
firebase init  # Select existing project
firebase deploy --only firestore:rules,storage
```

### Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Functions deployed:
- `onMarshmallowCreated` - Sends push notification
- `onCheckinCreated` - Notifies partner
- `onMemoryCreated` - Notifies partner
- `updateFCMToken` - Updates device tokens

### Seed Quick Picks Data

```bash
cd functions
npm run seed-quick-picks
```

This adds 10 preset marshmallow messages.

---

## 6️⃣ Install & Run App

### Install Dependencies

```bash
cd mobile
npm install
```

### Start Development Server

```bash
npx expo start
```

### Test on Device

1. Install Expo Go on your iPhone
2. Scan the QR code from the terminal
3. App should open in Expo Go

---

## 7️⃣ First Sign-In

### Partner 1 (Marcus)

1. Open app
2. Tap "Sign in with Google"
3. Select `marcusk639@gmail.com`
4. Grant permissions
5. **Result:** User profile created, couple document initialized

### Partner 2 (Erica)

1. Open app
2. Tap "Sign in with Google"
3. Select `ericajure@gmail.com`
4. Grant permissions
5. **Result:** Couple document completed, both partners connected!

### Verify Connection

On Home screen, you should see:
- "Good morning/afternoon/evening, Marcus/Erica!"
- "You and [partner name] are connected"

---

## 8️⃣ Optional: Push Notifications Setup

### For Expo Go (Development)

Push notifications work automatically using Expo's service. No additional setup needed!

### For Production Build (Later)

1. Create Expo account at [expo.dev](https://expo.dev)
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Initialize: `eas init`
5. Copy the Project ID to `.env`:
   ```bash
   EXPO_PUBLIC_PROJECT_ID=your-uuid-here
   ```
6. Build: `eas build --profile development --platform ios`

---

## ✅ Verification Checklist

- [ ] Firebase project created and services enabled
- [ ] `.env` file created with all values filled
- [ ] GoogleService-Info.plist downloaded (if using iOS)
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Cloud Functions deployed
- [ ] Quick picks seeded
- [ ] App runs in Expo Go
- [ ] Both partners can sign in
- [ ] Home screen shows connection status
- [ ] Can send marshmallows
- [ ] Can create check-ins
- [ ] Can add memories with photos
- [ ] All 127 tests passing: `npm test`

---

## 🔧 Troubleshooting

### "Configuration Error" on App Start

**Issue:** Missing or invalid environment variables

**Solution:**
```bash
# Check .env file exists and has all values
cat mobile/.env

# Restart Expo with cleared cache
cd mobile
npx expo start --clear
```

### "Not Authorized" on Sign-In

**Issue:** Email doesn't match configured partner emails

**Solution:**
- Verify email in `.env` exactly matches Google account
- Check for typos, case sensitivity
- Ensure EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is the Web client ID

### "Invalid ID Token"

**Issue:** Using iOS Client ID instead of Web Client ID

**Solution:**
- Check `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ends with `.apps.googleusercontent.com` (single, not double)
- Get Web Client ID from Firebase Console → Authentication → Google provider

### Push Notifications Not Working

**Issue:** Simulators don't support push notifications

**Solution:**
- Use physical device
- Set `EXPO_PUBLIC_PROJECT_ID` in `.env`
- Restart app after adding project ID

### Functions Deployment Fails

**Issue:** Need Blaze plan for Cloud Functions

**Solution:**
- Upgrade to Blaze (pay-as-you-go) plan in Firebase Console
- Free tier includes 2M function invocations/month
- Billing → Modify plan → Blaze

---

## 📚 Next Steps

Once setup is complete:

1. **Customize couple ID** (optional): Edit `/mobile/src/services/auth.ts`
2. **Add more quick picks**: Edit `/functions/src/seed-quick-picks.ts` and re-run
3. **Test all features**: Check-ins, marshmallows, memories, notifications
4. **Build for TestFlight**: Use `eas build` for iOS testing
5. **Deploy to App Store**: Complete when ready for production

---

## 🆘 Need Help?

1. Check [Firebase Documentation](https://firebase.google.com/docs)
2. Check [Expo Documentation](https://docs.expo.dev/)
3. Run tests: `cd mobile && npm test` (should see 127 passing)
4. Check error logs in terminal/Expo Go console

---

## 🎉 You're All Set!

Your app should now be fully functional with:
- ✅ Authentication (Google Sign-In)
- ✅ Real-time marshmallows
- ✅ Daily check-ins
- ✅ Photo memories
- ✅ Push notifications
- ✅ Activity feed
- ✅ Profile management

Enjoy sending sweet messages to each other! 💕
