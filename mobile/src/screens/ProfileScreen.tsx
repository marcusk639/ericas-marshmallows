import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getCurrentUser, getUserProfile, signOut } from '../services/auth';
import { getCheckinStreak } from '../services/dailyCheckins';
import { db } from '../config/firebase';
import { TimePickerModal } from '../components/TimePickerModal';
import type { User, Couple, Marshmallow, Memory, WithId } from '../../../shared/types';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<(User & { id: string }) | null>(null);
  const [partner, setPartner] = useState<(User & { id: string }) | null>(null);
  const [stats, setStats] = useState({
    marshmallowsSent: 0,
    marshmallowsReceived: 0,
    checkInStreak: 0,
    memoriesCreated: 0,
  });

  // Settings state
  const [morningTime, setMorningTime] = useState('09:00');
  const [eveningTime, setEveningTime] = useState('20:00');
  const [wifiOnly, setWifiOnly] = useState(false);

  // Time picker modal state
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
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

      // Set settings
      setMorningTime(userProfile.settings.morningCheckInTime);
      setEveningTime(userProfile.settings.eveningReminderTime);
      setWifiOnly(Boolean(userProfile.settings.wifiOnlySync));

      // Get partner info
      const coupleRef = doc(db, 'couples', userProfile.coupleId);
      const coupleDoc = await getDoc(coupleRef);

      if (coupleDoc.exists()) {
        const coupleData = coupleDoc.data() as Couple;
        const partnerId = coupleData.memberIds.find(id => id !== user.uid);

        if (partnerId && partnerId !== '') {
          const partnerProfile = await getUserProfile(partnerId);
          if (partnerProfile) {
            setPartner(partnerProfile as User & { id: string });
          }
        }
      }

      // Calculate statistics
      await loadStatistics(user.uid, userProfile.coupleId);
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async (userId: string, coupleId: string) => {
    try {
      // Get marshmallows sent
      const sentQuery = query(
        collection(db, 'marshmallows'),
        where('senderId', '==', userId),
        where('coupleId', '==', coupleId)
      );
      const sentSnapshot = await getDocs(sentQuery);
      const marshmallowsSent = sentSnapshot.size;

      // Get marshmallows received
      const receivedQuery = query(
        collection(db, 'marshmallows'),
        where('recipientId', '==', userId),
        where('coupleId', '==', coupleId)
      );
      const receivedSnapshot = await getDocs(receivedQuery);
      const marshmallowsReceived = receivedSnapshot.size;

      // Get check-in streak
      const streak = await getCheckinStreak(userId, coupleId);

      // Get memories created
      const memoriesQuery = query(
        collection(db, 'memories'),
        where('coupleId', '==', coupleId)
      );
      const memoriesSnapshot = await getDocs(memoriesQuery);
      const memoriesCreated = memoriesSnapshot.size;

      setStats({
        marshmallowsSent,
        marshmallowsReceived,
        checkInStreak: streak,
        memoriesCreated,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        'settings.morningCheckInTime': morningTime,
        'settings.eveningReminderTime': eveningTime,
        'settings.wifiOnlySync': Boolean(wifiOnly),
      });
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleMorningTimeConfirm = async (time: string) => {
    setMorningTime(time);
    setShowMorningPicker(false);

    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        'settings.morningCheckInTime': time,
      });
    } catch (error) {
      console.error('Error saving morning time:', error);
      Alert.alert('Error', 'Failed to save morning check-in time. Please try again.');
    }
  };

  const handleEveningTimeConfirm = async (time: string) => {
    setEveningTime(time);
    setShowEveningPicker(false);

    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        'settings.eveningReminderTime': time,
      });
    } catch (error) {
      console.error('Error saving evening time:', error);
      Alert.alert('Error', 'Failed to save evening reminder time. Please try again.');
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              setSigningOut(true);
              await signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9370DB" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Section 1: User Info */}
      <View style={styles.section}>
        <View style={styles.userInfoContainer}>
          {currentUser.photoUrl ? (
            <Image source={{ uri: currentUser.photoUrl }} style={styles.profilePhoto} />
          ) : (
            <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
              <Text style={styles.profilePhotoText}>
                {currentUser.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.userName}>{currentUser.name}</Text>
          <Text style={styles.userEmail}>{currentUser.email}</Text>
        </View>
      </View>

      {/* Section 2: Partner Info */}
      {partner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Partner</Text>
          <View style={styles.partnerContainer}>
            {partner.photoUrl ? (
              <Image source={{ uri: partner.photoUrl }} style={styles.partnerPhoto} />
            ) : (
              <View style={[styles.partnerPhoto, styles.profilePhotoPlaceholder]}>
                <Text style={styles.partnerPhotoText}>
                  {partner.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerName}>{partner.name}</Text>
              <Text style={styles.connectionStatus}>
                Connected as {currentUser.name} & {partner.name}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Section 3: Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.marshmallowsSent}</Text>
            <Text style={styles.statLabel}>Marshmallows Sent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.marshmallowsReceived}</Text>
            <Text style={styles.statLabel}>Marshmallows Received</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.checkInStreak}</Text>
            <Text style={styles.statLabel}>Check-In Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.memoriesCreated}</Text>
            <Text style={styles.statLabel}>Memories Created</Text>
          </View>
        </View>
      </View>

      {/* Section 4: Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowMorningPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Morning Check-In Time</Text>
            <Text style={styles.settingDescription}>When to send morning reminder</Text>
          </View>
          <Text style={styles.timeValue}>{morningTime}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowEveningPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Evening Reminder Time</Text>
            <Text style={styles.settingDescription}>When to send evening reminder</Text>
          </View>
          <Text style={styles.timeValue}>{eveningTime}</Text>
        </TouchableOpacity>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>WiFi-Only Sync</Text>
            <Text style={styles.settingDescription}>Only sync photos on WiFi</Text>
          </View>
          <Switch
            value={wifiOnly}
            onValueChange={(value) => {
              setWifiOnly(value);
              handleSaveSettings();
            }}
            trackColor={{ false: '#E5E7EB', true: '#FBCFE8' }}
            thumbColor={wifiOnly ? '#9370DB' : '#9CA3AF'}
          />
        </View>
      </View>

      {/* Section 5: Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          disabled={signingOut}
          activeOpacity={0.8}
        >
          {signingOut ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Erica's Marshmallows v1.0</Text>

      {/* Time Picker Modals */}
      <TimePickerModal
        visible={showMorningPicker}
        title="Morning Check-In Time"
        initialTime={morningTime}
        onConfirm={handleMorningTimeConfirm}
        onCancel={() => setShowMorningPicker(false)}
      />

      <TimePickerModal
        visible={showEveningPicker}
        title="Evening Reminder Time"
        initialTime={eveningTime}
        onConfirm={handleEveningTimeConfirm}
        onCancel={() => setShowEveningPicker(false)}
      />
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
    gap: 20,
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
  errorText: {
    fontSize: 16,
    color: '#DC2626',
  },
  section: {
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

  // User Info Section
  userInfoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  profilePhotoPlaceholder: {
    backgroundColor: '#9370DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhotoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9370DB',
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Partner Info Section
  partnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  partnerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  partnerPhotoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  partnerInfo: {
    flex: 1,
    gap: 4,
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  connectionStatus: {
    fontSize: 14,
    color: '#9370DB',
    fontWeight: '500',
  },

  // Statistics Section
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#9370DB',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Settings Section
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    gap: 4,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9370DB',
  },

  // Actions Section
  signOutButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});
