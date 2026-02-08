import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { signInWithGoogle, useGoogleAuth } from "../services/auth";

export const LoginScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Header Section */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🍭</Text>
          <Text style={styles.title}>Erica's Marshmallows</Text>
          <Text style={styles.subtitle}>
            Sweet moments between{"\n"}Marcus & Erica
          </Text>
        </View>

        {/* Sign In Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.signInButton,
              (loading || !request) && styles.signInButtonDisabled,
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
                <Text style={styles.signInButtonText}>Sign in with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            This app is exclusively for Marcus and Erica.{"\n"}
            Please sign in with your authorized account.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Share sweet moments, daily check-ins,{"\n"}
            and cherished memories together
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F7", // Light pink background
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#D946A6", // Pink color
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#64748B", // Slate gray
    textAlign: "center",
    lineHeight: 26,
  },
  buttonContainer: {
    alignItems: "center",
    gap: 16,
  },
  signInButton: {
    backgroundColor: "#D946A6", // Pink color
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    shadowColor: "#D946A6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginRight: 12,
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  footer: {
    alignItems: "center",
    marginBottom: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#94A3B8", // Light slate gray
    textAlign: "center",
    lineHeight: 20,
  },
});
