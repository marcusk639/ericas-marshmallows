import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import type { Memory, WithId } from '../../../shared/types';
import { getTimeAgo } from '../utils/timeUtils';

interface MemoryCardProps {
  memory: WithId<Memory>;
  onPress: (memory: WithId<Memory>) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_PADDING = 16;
const CARD_WIDTH = SCREEN_WIDTH - CARD_PADDING * 2;

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onPress }) => {
  const formatDate = (timestamp: { seconds: number; nanoseconds: number }) => {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Render photo grid based on number of photos
  const renderPhotoGrid = () => {
    const photoCount = memory.photoUrls.length;

    if (photoCount === 0) {
      return null;
    }

    if (photoCount === 1) {
      return (
        <Image
          source={{ uri: memory.photoUrls[0] }}
          style={styles.singlePhoto}
          resizeMode="cover"
        />
      );
    }

    if (photoCount === 2) {
      return (
        <View style={styles.twoPhotoGrid}>
          <Image
            source={{ uri: memory.photoUrls[0] }}
            style={styles.halfPhoto}
            resizeMode="cover"
          />
          <Image
            source={{ uri: memory.photoUrls[1] }}
            style={styles.halfPhoto}
            resizeMode="cover"
          />
        </View>
      );
    }

    // For 3+ photos, show grid layout
    return (
      <View style={styles.multiPhotoGrid}>
        <Image
          source={{ uri: memory.photoUrls[0] }}
          style={styles.largePhoto}
          resizeMode="cover"
        />
        <View style={styles.smallPhotosColumn}>
          <Image
            source={{ uri: memory.photoUrls[1] }}
            style={styles.smallPhoto}
            resizeMode="cover"
          />
          {photoCount > 2 && (
            <View style={styles.smallPhotoWrapper}>
              <Image
                source={{ uri: memory.photoUrls[2] }}
                style={styles.smallPhoto}
                resizeMode="cover"
              />
              {photoCount > 3 && (
                <View style={styles.morePhotosOverlay}>
                  <Text style={styles.morePhotosText}>+{photoCount - 3}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(memory)}
      activeOpacity={0.7}
      style={styles.container}
    >
      {/* Photo Grid */}
      {memory.photoUrls.length > 0 && (
        <View style={styles.photoContainer}>{renderPhotoGrid()}</View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>{memory.title}</Text>
        {memory.description && (
          <Text style={styles.description} numberOfLines={3}>
            {memory.description}
          </Text>
        )}

        {/* Tags */}
        {memory.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {memory.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(memory.date)}</Text>
          <Text style={styles.timestamp}>{getTimeAgo(memory.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: CARD_PADDING,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  photoContainer: {
    width: '100%',
    backgroundColor: '#F3F4F6',
  },
  singlePhoto: {
    width: '100%',
    height: 240,
  },
  twoPhotoGrid: {
    flexDirection: 'row',
    height: 200,
  },
  halfPhoto: {
    flex: 1,
    height: 200,
  },
  multiPhotoGrid: {
    flexDirection: 'row',
    height: 200,
  },
  largePhoto: {
    flex: 2,
    height: 200,
  },
  smallPhotosColumn: {
    flex: 1,
    height: 200,
  },
  smallPhotoWrapper: {
    flex: 1,
    position: 'relative',
  },
  smallPhoto: {
    flex: 1,
    width: '100%',
  },
  morePhotosOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 21,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#FCE7F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#D946A6',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    color: '#D946A6',
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
