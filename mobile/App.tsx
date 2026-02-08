import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { User as FirebaseUser } from 'firebase/auth';
import { LoginScreen } from './src/screens/LoginScreen';
import { configureGoogleSignIn, onAuthStateChange } from './src/services/auth';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Configure Google Sign-In
    try {
      configureGoogleSignIn();
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
      setConfigError(
        error instanceof Error
          ? error.message
          : 'Failed to configure Google Sign-In. Please check your environment configuration.'
      );
      setLoading(false);
      return;
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
        <ActivityIndicator size="large" color="#D946A6" />
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
    <NavigationContainer>
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
