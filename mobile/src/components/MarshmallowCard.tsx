import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Marshmallow, WithId } from '../../../shared/types';
import { getTimeAgo } from '../utils/timeUtils';

interface MarshmallowCardProps {
  marshmallow: WithId<Marshmallow>;
  currentUserId: string;
  onPress: (marshmallow: WithId<Marshmallow>) => void;
}

export const MarshmallowCard: React.FC<MarshmallowCardProps> = ({
  marshmallow,
  currentUserId,
  onPress,
}) => {
  const isSent = marshmallow.senderId === currentUserId;
  const showUnreadBadge = !isSent && !marshmallow.read;

  console.log('MarshmallowCard: Rendering card for:', {
    id: marshmallow.id,
    message: marshmallow.message.substring(0, 20),
    isSent,
    currentUserId,
  });

  return (
    <TouchableOpacity
      onPress={() => onPress(marshmallow)}
      activeOpacity={0.7}
      style={[styles.container, isSent ? styles.sentContainer : styles.receivedContainer]}
    >
      <View style={[styles.bubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
        <Text style={[styles.message, isSent ? styles.sentMessage : styles.receivedMessage]}>
          {marshmallow.message}
        </Text>
        <View style={styles.footer}>
          <Text style={[styles.timestamp, isSent ? styles.sentTimestamp : styles.receivedTimestamp]}>
            {getTimeAgo(marshmallow.createdAt)}
          </Text>
          {showUnreadBadge && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>New</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    width: '100%',
  },
  sentContainer: {
    alignItems: 'flex-end',
  },
  receivedContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sentBubble: {
    backgroundColor: '#9370DB',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  sentMessage: {
    color: '#FFFFFF',
  },
  receivedMessage: {
    color: '#1F2937',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    lineHeight: 16,
  },
  sentTimestamp: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  receivedTimestamp: {
    color: '#9CA3AF',
  },
  unreadBadge: {
    backgroundColor: '#9370DB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
