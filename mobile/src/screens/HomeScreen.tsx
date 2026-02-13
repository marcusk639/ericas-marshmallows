import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUser, getUserProfile } from '../services/auth';
import { getCheckinStreak } from '../services/dailyCheckins';
import type { User, Couple, DailyCheckin, Marshmallow, Memory, WithId } from '../../../shared/types';

interface ActivityItem {
  id: string;
  type: 'marshmallow' | 'checkin' | 'memory';
  message: string;
  timestamp: Date;
  fromPartner?: boolean;
}

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<(User & { id: string }) | null>(null);
  const [partner, setPartner] = useState<(User & { id: string}) | null>(null);
  const [todayCheckin, setTodayCheckin] = useState<boolean>(false);
  const [partnerCheckin, setPartnerCheckin] = useState<boolean>(false);
  const [todayMarshmallows, setTodayMarshmallows] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      const user = getCurrentUser();

      if (!user) {
        return;
      }

      // Get user profile
      const userProfile = await getUserProfile(user.uid);
      if (!userProfile) {
        return;
      }

      setCurrentUser(userProfile as User & { id: string });

      // Get partner info
      const coupleRef = doc(db, 'couples', userProfile.coupleId);
      const coupleDoc = await getDoc(coupleRef);

      let partnerId: string | null = null;
      if (coupleDoc.exists()) {
        const coupleData = coupleDoc.data() as Couple;
        partnerId = coupleData.memberIds.find(id => id !== user.uid) || null;

        if (partnerId && partnerId !== '') {
          const partnerProfile = await getUserProfile(partnerId);
          if (partnerProfile) {
            setPartner(partnerProfile as User & { id: string });
          }
        }
      }

      // Load today's data
      await Promise.all([
        loadTodayCheckins(user.uid, partnerId, userProfile.coupleId),
        loadTodayMarshmallows(user.uid, userProfile.coupleId),
        loadStreak(user.uid, userProfile.coupleId),
        loadRecentActivity(user.uid, partnerId, userProfile.coupleId),
      ]);
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayCheckins = async (userId: string, partnerId: string | null, coupleId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check user's check-in
      const userQuery = query(
        collection(db, 'dailyCheckins'),
        where('userId', '==', userId),
        where('coupleId', '==', coupleId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const checkin = userSnapshot.docs[0].data();
        const checkinDate = new Date((checkin.createdAt as any).seconds * 1000);
        checkinDate.setHours(0, 0, 0, 0);
        setTodayCheckin(checkinDate.getTime() === today.getTime());
      }

      // Check partner's check-in
      if (partnerId) {
        const partnerQuery = query(
          collection(db, 'dailyCheckins'),
          where('userId', '==', partnerId),
          where('coupleId', '==', coupleId),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const partnerSnapshot = await getDocs(partnerQuery);
        if (!partnerSnapshot.empty) {
          const checkin = partnerSnapshot.docs[0].data();
          const checkinDate = new Date((checkin.createdAt as any).seconds * 1000);
          checkinDate.setHours(0, 0, 0, 0);
          setPartnerCheckin(checkinDate.getTime() === today.getTime());
        }
      }
    } catch (error) {
      console.error('Error loading today checkins:', error);
    }
  };

  const loadTodayMarshmallows = async (userId: string, coupleId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime() / 1000;

      const q = query(
        collection(db, 'marshmallows'),
        where('recipientId', '==', userId),
        where('coupleId', '==', coupleId)
      );
      const snapshot = await getDocs(q);

      const todayCount = snapshot.docs.filter((doc) => {
        const data = doc.data();
        return (data.createdAt as any).seconds >= todayTimestamp;
      }).length;

      setTodayMarshmallows(todayCount);
    } catch (error) {
      console.error('Error loading today marshmallows:', error);
    }
  };

  const loadStreak = async (userId: string, coupleId: string) => {
    try {
      const streakCount = await getCheckinStreak(userId, coupleId);
      setStreak(streakCount);
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  const loadRecentActivity = async (userId: string, partnerId: string | null, coupleId: string) => {
    try {
      const activities: ActivityItem[] = [];

      // Get recent marshmallows (received)
      const marshmallowsQuery = query(
        collection(db, 'marshmallows'),
        where('coupleId', '==', coupleId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const marshmallowsSnapshot = await getDocs(marshmallowsQuery);
      marshmallowsSnapshot.docs.forEach((doc) => {
        const data = doc.data() as Marshmallow;
        const isReceived = data.recipientId === userId;
        activities.push({
          id: doc.id,
          type: 'marshmallow',
          message: isReceived
            ? `You received: "${data.message.substring(0, 40)}${data.message.length > 40 ? '...' : ''}"`
            : `You sent: "${data.message.substring(0, 40)}${data.message.length > 40 ? '...' : ''}"`,
          timestamp: new Date((data.createdAt as any).seconds * 1000),
          fromPartner: isReceived,
        });
      });

      // Get recent check-ins
      const checkinsQuery = query(
        collection(db, 'dailyCheckins'),
        where('coupleId', '==', coupleId),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const checkinsSnapshot = await getDocs(checkinsQuery);
      checkinsSnapshot.docs.forEach((doc) => {
        const data = doc.data() as DailyCheckin;
        const isPartner = data.userId === partnerId;
        activities.push({
          id: doc.id,
          type: 'checkin',
          message: isPartner ? 'Your partner checked in' : 'You checked in',
          timestamp: new Date((data.createdAt as any).seconds * 1000),
          fromPartner: isPartner,
        });
      });

      // Get recent memories
      const memoriesQuery = query(
        collection(db, 'memories'),
        where('coupleId', '==', coupleId),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const memoriesSnapshot = await getDocs(memoriesQuery);
      memoriesSnapshot.docs.forEach((doc) => {
        const data = doc.data() as Memory;
        const isPartner = data.createdBy === partnerId;
        activities.push({
          id: doc.id,
          type: 'memory',
          message: isPartner
            ? `Your partner created: "${data.title}"`
            : `You created: "${data.title}"`,
          timestamp: new Date((data.createdAt as any).seconds * 1000),
          fromPartner: isPartner,
        });
      });

      // Sort by timestamp and take the 10 most recent
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9370DB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#9370DB']} />}
    >
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{getGreeting()}, {currentUser?.name.split(' ')[0]}!</Text>
        {partner && (
          <Text style={styles.subGreeting}>
            You and {partner.name.split(' ')[0]} are connected
          </Text>
        )}
      </View>

      {/* Today's Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, todayCheckin && styles.summaryCardComplete]}>
            <Text style={styles.summaryIcon}>{todayCheckin ? '✓' : '○'}</Text>
            <Text style={styles.summaryLabel}>Your Check-In</Text>
            <Text style={styles.summaryValue}>{todayCheckin ? 'Done' : 'Pending'}</Text>
          </View>

          <View style={[styles.summaryCard, partnerCheckin && styles.summaryCardComplete]}>
            <Text style={styles.summaryIcon}>{partnerCheckin ? '✓' : '○'}</Text>
            <Text style={styles.summaryLabel}>Partner Check-In</Text>
            <Text style={styles.summaryValue}>{partnerCheckin ? 'Done' : 'Pending'}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>💕</Text>
            <Text style={styles.summaryLabel}>Marshmallows</Text>
            <Text style={styles.summaryValue}>{todayMarshmallows}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryIcon}>🔥</Text>
            <Text style={styles.summaryLabel}>Streak</Text>
            <Text style={styles.summaryValue}>{streak} days</Text>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {recentActivity.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No recent activity</Text>
            <Text style={styles.emptyStateHint}>Start by sending a marshmallow or checking in!</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recentActivity.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>
                    {item.type === 'marshmallow' ? '💕' :
                     item.type === 'checkin' ? '✓' : '📷'}
                  </Text>
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityMessage}>{item.message}</Text>
                  <Text style={styles.activityTime}>{formatRelativeTime(item.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  contentContainer: {
    padding: 20,
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
  greetingSection: {
    paddingVertical: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#9370DB',
    fontWeight: '500',
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  summaryCardComplete: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0E6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyStateHint: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
