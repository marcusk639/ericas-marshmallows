import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { User as FirebaseUser } from 'firebase/auth';
import { LoginScreen } from './src/screens/LoginScreen';
import { configureGoogleSignIn, onAuthStateChange } from './src/services/auth';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In
    try {
      configureGoogleSignIn();
    } catch (error) {
      console.error('Error configuring Google Sign-In:', error);
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  // Main app content (placeholder for now)
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome, {user.displayName || 'User'}!</Text>
      <Text style={styles.emailText}>{user.email}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D946A6',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#64748B',
  },
});
