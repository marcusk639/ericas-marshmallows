import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { User as FirebaseUser } from 'firebase/auth';
import * as Notifications from 'expo-notifications';
import { LoginScreen } from './src/screens/LoginScreen';
import { subscribeToAuthChanges } from './src/services/auth';
import { initializePushNotifications } from './src/services/notifications';
import RootNavigator from './src/navigation/RootNavigator';
import type { RootTabParamList } from './src/navigation/types';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  const navigationRef = useRef<NavigationContainerRef<RootTabParamList>>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = subscribeToAuthChanges((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (!user) return;

    const handleNotificationTap = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;

      // Navigate based on notification type
      if (data.type === 'marshmallow') {
        navigationRef.current?.navigate('Marshmallows');
      } else if (data.type === 'checkin') {
        navigationRef.current?.navigate('CheckIn');
      } else if (data.type === 'memory') {
        navigationRef.current?.navigate('Memories');
      }
    };

    const cleanup = initializePushNotifications(user.uid, handleNotificationTap);

    return () => {
      cleanup.then((cleanupFn) => cleanupFn());
    };
  }, [user]);

  // Show configuration error if Google Sign-In setup failed
  if (configError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Configuration Error</Text>
        <Text style={styles.errorText}>{configError}</Text>
        <Text style={styles.errorHint}>
          Please check your .env file and ensure all required environment variables are set.
        </Text>
      </View>
    );
  }

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9370DB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <>
        <LoginScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  // Main app content with navigation
  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
});
