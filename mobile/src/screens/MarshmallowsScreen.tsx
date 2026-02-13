import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { useMarshmallows } from '../hooks/useMarshmallows';
import { MarshmallowCard } from '../components/MarshmallowCard';
import { SendMarshmallowModal } from '../components/SendMarshmallowModal';
import { getCurrentUser } from '../services/auth';
import { getUserProfile } from '../services/auth';
import { db } from '../config/firebase';
import type { WithId, Marshmallow, Couple } from '../../../shared/types';

export default function MarshmallowsScreen() {
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
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

          // Get partner's ID from couple document
          try {
            const coupleRef = doc(db, 'couples', profile.coupleId);
            const coupleDoc = await getDoc(coupleRef);

            if (coupleDoc.exists()) {
              const coupleData = coupleDoc.data() as Couple;
              const partnerId = coupleData.memberIds.find(id => id !== user.uid);
              if (partnerId && partnerId !== '') {
                setRecipientId(partnerId);
              }
            }
          } catch (error) {
            console.error('Error getting partner ID:', error);
          }
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
        <ActivityIndicator size="large" color="#9370DB" />
        <Text style={styles.loadingText}>Loading marshmallows...</Text>
      </View>
    );
  }

  // Show empty state
  if (marshmallows.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>💌</Text>
          <Text style={styles.emptyTitle}>No marshmallows yet</Text>
          <Text style={styles.emptySubtitle}>
            Send your partner some love to get started!
          </Text>
        </View>

        {/* Floating Action Button */}
        {recipientId && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        )}

        {/* Send Marshmallow Modal */}
        <SendMarshmallowModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          recipientId={recipientId || ''}
          coupleId={coupleId}
          senderId={currentUserId}
        />
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

      {/* Floating Action Button */}
      {recipientId && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Send Marshmallow Modal */}
      <SendMarshmallowModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        recipientId={recipientId || ''}
        coupleId={coupleId}
        senderId={currentUserId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  listContent: {
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
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
    color: '#9370DB',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#9370DB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 32,
  },
});
