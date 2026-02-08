# Authentication Setup - Manual Steps Required

This document outlines the manual Firebase Console steps needed to complete the Google Sign-In authentication setup.

## Step 1: Enable Google Sign-In in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ericas-marshmallows`
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Configure the support email
7. Click **Save**

## Step 2: Get Web Client ID

After enabling Google Sign-In:

1. In the Google provider settings, you'll see a **Web SDK configuration** section
2. Copy the **Web client ID** (it will look like: `xxxxx.apps.googleusercontent.com`)
3. Add this to your `.env` file:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Step 3: Configure iOS URL Scheme (if not already done)

1. In Firebase Console, go to **Project Settings** → **General**
2. Scroll down to **Your apps** section
3. Find your iOS app
4. Copy the iOS URL scheme (looks like: `com.googleusercontent.apps.xxxxx`)
5. Update `mobile/app.json` and replace `YOUR_IOS_CLIENT_ID` in the plugin configuration with the iOS client ID

## Step 4: Configure Android OAuth Client

For Android to work properly:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. You should see an Android OAuth 2.0 Client ID
5. If not, create one:
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Android**
   - Package name: `com.ericasmarshmallows.app`
   - SHA-1 certificate fingerprint: Get this by running:
     ```bash
     cd mobile/android
     ./gradlew signingReport
     ```
   - Copy the SHA-1 from the debug keystore

## Step 5: Test Authentication

1. Ensure your `.env` file has all required variables:
   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=ericas-marshmallows
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
   ```

2. Run the app:
   ```bash
   cd mobile
   npx expo start
   ```

3. Test sign-in with both Marcus and Erica's email addresses

## Security Notes

- Only Marcus (`marcus@example.com`) and Erica (`erica@example.com`) can sign in
- Email addresses are checked in the auth service
- Unauthorized users are immediately signed out
- The couple configuration is hardcoded in `mobile/src/services/auth.ts`

## Troubleshooting

### "Sign-in failed" error
- Verify the Web Client ID is correct
- Ensure Google Sign-In is enabled in Firebase Console
- Check that the email is either `marcus@example.com` or `erica@example.com`

### Android sign-in not working
- Verify SHA-1 fingerprint is added to Firebase
- Check that package name matches: `com.ericasmarshmallows.app`
- Rebuild the app after adding SHA-1

### iOS sign-in not working
- Verify the iOS URL scheme is correctly configured in `app.json`
- Check Bundle Identifier matches: `com.ericasmarshmallows.app`
- Ensure the iOS app is registered in Firebase Console
