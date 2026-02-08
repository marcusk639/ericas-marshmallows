import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { useMarshmallows } from '../hooks/useMarshmallows';
import { MarshmallowCard } from '../components/MarshmallowCard';
import { getCurrentUser } from '../services/auth';
import { getUserProfile } from '../services/auth';
import type { WithId, Marshmallow } from '../../../shared/types';

export default function MarshmallowsScreen() {
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { marshmallows, loading, markAsRead } = useMarshmallows(coupleId);

  // Get current user and their coupleId
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

  const handleMarshmallowPress = async (marshmallow: WithId<Marshmallow>) => {
    // Only mark as read if it's received and unread
    if (marshmallow.recipientId === currentUserId && !marshmallow.read) {
      await markAsRead(marshmallow.id);
    }
  };

  // Show loading state
  if (loading && marshmallows.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D946A6" />
        <Text style={styles.loadingText}>Loading marshmallows...</Text>
      </View>
    );
  }

  // Show empty state
  if (marshmallows.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>💌</Text>
        <Text style={styles.emptyTitle}>No marshmallows yet</Text>
        <Text style={styles.emptySubtitle}>
          Send your partner some love to get started!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={marshmallows}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MarshmallowCard
            marshmallow={item}
            currentUserId={currentUserId || ''}
            onPress={handleMarshmallowPress}
          />
        )}
        contentContainerStyle={styles.listContent}
        inverted
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
  },
  listContent: {
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D946A6',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
