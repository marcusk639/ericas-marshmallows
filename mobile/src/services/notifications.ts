import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Configure notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permission');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Get the Expo push token for this device
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    // For Expo Go, we need to use the Expo push notification service
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });

    console.log('Expo push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}

/**
 * Get the device push token (FCM for Android, APNs for iOS)
 * This is used for production apps outside of Expo Go
 */
export async function getDevicePushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return null;
    }

    const token = await Notifications.getDevicePushTokenAsync();
    console.log('Device push token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error getting device push token:', error);
    return null;
  }
}

/**
 * Register push token with the user's profile in Firestore
 */
export async function registerPushToken(
  userId: string,
  token: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      'settings.notificationsEnabled': true,
    });
    console.log('Successfully registered push token for user:', userId);
  } catch (error) {
    console.error('Error registering push token:', error);
    throw new Error('Failed to register push token');
  }
}

/**
 * Set up notification listeners
 * Returns cleanup function to remove listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
): () => void {
  // Listener for notifications received while app is foregrounded
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  // Listener for user tapping on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    }
  );

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Configure notification channels for Android
 */
export async function configureNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D946A6',
    });

    await Notifications.setNotificationChannelAsync('marshmallows', {
      name: 'Marshmallows',
      description: 'Sweet messages from your partner',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D946A6',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('checkins', {
      name: 'Check-Ins',
      description: 'Daily check-in reminders and partner updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D946A6',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('memories', {
      name: 'Memories',
      description: 'New memories from your partner',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D946A6',
      sound: 'default',
    });
  }
}

/**
 * Initialize push notifications for the app
 * Call this once when the app starts and user is authenticated
 */
export async function initializePushNotifications(
  userId: string,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
): Promise<() => void> {
  try {
    // Configure Android notification channels
    await configureNotificationChannels();

    // Request permissions
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.log('Push notifications not enabled - permission denied');
      return () => {}; // Return empty cleanup function
    }

    // Get push token
    const token = await getExpoPushToken();
    if (token) {
      // Register token with user profile
      await registerPushToken(userId, token);
    }

    // Set up notification listeners
    const cleanup = setupNotificationListeners(undefined, onNotificationTapped);

    return cleanup;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return () => {}; // Return empty cleanup function on error
  }
}
