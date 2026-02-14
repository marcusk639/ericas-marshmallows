import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useDailyCheckin, useCreateCheckin, useCheckinStreak } from '../hooks/useDailyCheckin';
import { getCurrentUser, getUserProfile } from '../services/auth';
import MoodSelector from '../components/MoodSelector';
import GratitudeInput from '../components/GratitudeInput';
import StreakBadge from '../components/StreakBadge';
import { MOOD_OPTIONS } from '../../../shared/types';
import type { MoodType } from '../../../shared/types';

export default function DailyCheckinScreen() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [gratitude, setGratitude] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const { myCheckin, partnerCheckin, loading, refresh } = useDailyCheckin(
    currentUserId,
    coupleId
  );
  const { createCheckin, creating } = useCreateCheckin(currentUserId, coupleId);
  const { streak, refresh: refreshStreak } = useCheckinStreak(currentUserId, coupleId);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      const user = getCurrentUser();
      if (user) {
        setCurrentUserId(user.uid);
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setCoupleId(profile.coupleId);
        }
      }
    };

    loadUserData();
  }, []);

  // Scroll to bottom when keyboard shows
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardWillShow.remove();
    };
  }, []);

  const handleSubmit = async () => {
    if (!selectedMood || !gratitude.trim()) {
      return;
    }

    try {
      await createCheckin(selectedMood, undefined, gratitude.trim());
      // Refresh data after successful submission
      refresh();
      refreshStreak();
      // Reset form
      setSelectedMood(null);
      setGratitude('');
    } catch (error) {
      console.error('Error submitting check-in:', error);
    }
  };

  const isSubmitDisabled = !selectedMood || !gratitude.trim() || creating;

  // Show loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator testID="loading-indicator" size="large" color="#9370DB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show completion state if user has already checked in
  if (myCheckin) {
    const myMood = MOOD_OPTIONS.find((m) => m.type === myCheckin.mood);
    const myMoodDisplay = myMood
      ? myMood.label.toLowerCase()
      : myCheckin.mood.trim().toLowerCase();

    const partnerMood = partnerCheckin
      ? MOOD_OPTIONS.find((m) => m.type === partnerCheckin.mood)
      : null;
    const partnerMoodDisplay = partnerCheckin
      ? (partnerMood ? partnerMood.emoji : '💭')
      : null;
    const partnerMoodLabel = partnerCheckin
      ? (partnerMood ? partnerMood.label : partnerCheckin.mood.trim())
      : null;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Header with streak */}
        <View style={styles.header}>
          <StreakBadge streak={streak} />
        </View>

        {/* Completion message */}
        <View style={styles.completionCard}>
          <Text style={styles.completionEmoji}>✅</Text>
          <Text style={styles.completionTitle}>You've checked in today!</Text>
          <Text style={styles.completionSubtitle}>You're feeling {myMoodDisplay}</Text>
        </View>

        {/* My gratitude */}
        <View style={styles.gratitudeCard}>
          <Text style={styles.gratitudeLabel}>Your gratitude</Text>
          <Text style={styles.gratitudeText}>{myCheckin.gratitude}</Text>
        </View>

        {/* Partner's check-in */}
        {partnerCheckin && partnerMoodDisplay && (
          <View style={styles.partnerCard}>
            <Text style={styles.partnerLabel}>Your partner's mood</Text>
            <View style={styles.partnerMoodContainer}>
              <Text style={styles.partnerMoodEmoji}>{partnerMoodDisplay}</Text>
              <Text style={styles.partnerMoodLabel}>{partnerMoodLabel}</Text>
            </View>
            <View style={styles.partnerGratitudeContainer}>
              <Text style={styles.gratitudeLabel}>Their gratitude</Text>
              <Text style={styles.gratitudeText}>{partnerCheckin.gratitude}</Text>
            </View>
          </View>
        )}

        {/* Waiting for partner */}
        {!partnerCheckin && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingEmoji}>⏳</Text>
            <Text style={styles.waitingText}>Waiting for your partner to check in...</Text>
          </View>
        )}

        <Text style={styles.footer}>Come back tomorrow for another check-in!</Text>
      </ScrollView>
    );
  }

  // Show check-in form
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with streak */}
        <View style={styles.header}>
          <StreakBadge streak={streak} />
        </View>

        {/* Title */}
        <Text style={styles.title}>How are you feeling today?</Text>

        {/* Mood selector */}
        <MoodSelector selectedMood={selectedMood} onSelect={setSelectedMood} />

        {/* Gratitude input */}
        {selectedMood && (
          <View style={styles.gratitudeSection}>
            <Text style={styles.sectionTitle}>Share your gratitude</Text>
            <GratitudeInput value={gratitude} onChange={setGratitude} />
          </View>
        )}

        {/* Submit button */}
        {selectedMood && (
          <TouchableOpacity
            testID="submit-button"
            style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled}
            activeOpacity={0.8}
          >
            {creating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Check-In</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 400, // Extra padding for keyboard
    gap: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9370DB',
    textAlign: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  gratitudeSection: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#9370DB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  completionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  completionEmoji: {
    fontSize: 48,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9370DB',
  },
  completionSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  gratitudeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  gratitudeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  gratitudeText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  partnerLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  partnerMoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    padding: 16,
    borderRadius: 12,
  },
  partnerMoodEmoji: {
    fontSize: 32,
  },
  partnerMoodLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9370DB',
  },
  partnerGratitudeContainer: {
    marginTop: 8,
  },
  waitingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  waitingEmoji: {
    fontSize: 40,
  },
  waitingText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  footer: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
