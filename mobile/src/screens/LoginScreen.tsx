import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { signInWithGoogle, useGoogleAuth, signInWithEmail, signUpWithEmail } from "../services/auth";

type AuthMode = 'signin' | 'signup';

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { request, response, promptAsync } = useGoogleAuth();

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.idToken && authentication?.accessToken) {
        handleSignInWithTokens(authentication.idToken, authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      Alert.alert(
        "Sign In Failed",
        "Failed to authenticate with Google. Please try again.",
        [{ text: "OK" }]
      );
      setLoading(false);
    } else if (response?.type === 'dismiss' || response?.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const handleSignInWithTokens = async (idToken: string, accessToken: string) => {
    try {
      await signInWithGoogle(idToken, accessToken);
      // Navigation to main app will be handled by auth state change in App.tsx
    } catch (error: any) {
      Alert.alert(
        "Sign In Failed",
        error.message || "An unexpected error occurred. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await promptAsync();
    } catch (error: any) {
      Alert.alert(
        "Sign In Failed",
        error.message || "An unexpected error occurred. Please try again.",
        [{ text: "OK" }]
      );
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      if (authMode === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      // Navigation to main app will be handled by auth state change in App.tsx
    } catch (error: any) {
      Alert.alert(
        authMode === 'signup' ? "Sign Up Failed" : "Sign In Failed",
        error.message || "An unexpected error occurred. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Header Section */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🍭</Text>
            <Text style={styles.title}>Erica's Marshmallows</Text>
            <Text style={styles.subtitle}>
              Sweet moments between{"\n"}Marcus & Erica
            </Text>
          </View>

          {/* Auth Mode Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, authMode === 'signin' && styles.toggleButtonActive]}
              onPress={() => setAuthMode('signin')}
            >
              <Text style={[styles.toggleText, authMode === 'signin' && styles.toggleTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, authMode === 'signup' && styles.toggleButtonActive]}
              onPress={() => setAuthMode('signup')}
            >
              <Text style={[styles.toggleText, authMode === 'signup' && styles.toggleTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email/Password Form */}
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.authButton, loading && styles.authButtonDisabled]}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.authButtonText}>
                  {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button */}
          <View style={styles.googleContainer}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                (loading || !request) && styles.googleButtonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading || !request}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            This app is exclusively for Marcus and Erica.{"\n"}
            Please use your authorized account.
          </Text>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Share sweet moments, daily check-ins,{"\n"}
              and cherished memories together
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F7",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#D946A6",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#D946A6",
  },
  toggleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  formContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 2,
    borderColor: "#FED7E2",
  },
  authButton: {
    backgroundColor: "#D946A6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#D946A6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  googleContainer: {
    marginBottom: 16,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: "#4285F4",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  googleButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 12,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 18,
  },
});
