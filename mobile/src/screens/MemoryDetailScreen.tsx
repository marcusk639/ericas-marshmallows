import React, { useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import type { WithId, Memory } from "../../../shared/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface MemoryDetailScreenProps {
  route: {
    params: {
      memory: WithId<Memory>;
    };
  };
  navigation: any;
}

export default function MemoryDetailScreen({
  route,
  navigation,
}: MemoryDetailScreenProps) {
  const { memory } = route.params;
  const [fullscreenMedia, setFullscreenMedia] = useState<{
    url: string;
    type: "photo" | "video";
  } | null>(null);

  // Combine photos and videos into a single media array
  const mediaItems = [
    ...memory.photoUrls.map((url) => ({ url, type: "photo" as const })),
    ...(memory.videoUrls || []).map((url) => ({ url, type: "video" as const })),
  ];

  // Debug logging
  console.log('MemoryDetailScreen - Memory ID:', memory.id);
  console.log('MemoryDetailScreen - Photo URLs:', memory.photoUrls);
  console.log('MemoryDetailScreen - Video URLs:', memory.videoUrls);
  console.log('MemoryDetailScreen - Media items count:', mediaItems.length);

  const renderMediaItem = (url: string, type: "photo" | "video") => {
    if (type === "photo") {
      return (
        <TouchableOpacity
          key={url}
          onPress={() => setFullscreenMedia({ url, type: "photo" })}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: url }}
            style={styles.mediaItem}
            resizeMode="cover"
            onError={(error) => console.error('Image load error:', url, error)}
            onLoad={() => console.log('Image loaded successfully:', url)}
          />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={url}
        onPress={() => setFullscreenMedia({ url, type: "video" })}
        activeOpacity={0.9}
      >
        <Video
          source={{ uri: url }}
          style={styles.mediaItem}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          useNativeControls={false}
          isLooping={false}
        />
        <View style={styles.videoOverlay}>
          <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#9370DB" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {memory.title}
          </Text>
          <Text style={styles.headerDate}>
            {new Date(memory.date.seconds * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Media Gallery */}
        {mediaItems.length > 0 ? (
          <View style={styles.mediaGrid}>
            {mediaItems.map((item) => renderMediaItem(item.url, item.type))}
          </View>
        ) : (
          <View style={styles.emptyMedia}>
            <Text style={styles.emptyMediaIcon}>📷</Text>
            <Text style={styles.emptyMediaText}>No photos or videos in this memory</Text>
          </View>
        )}

        {/* Description */}
        {memory.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{memory.description}</Text>
          </View>
        )}

        {/* Tags */}
        {memory.tags.length > 0 && (
          <View style={styles.tagsCard}>
            <Text style={styles.tagsLabel}>Tags</Text>
            <View style={styles.tagsContainer}>
              {memory.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="images" size={24} color="#9370DB" />
            <Text style={styles.statText}>
              {memory.photoUrls.length} photo{memory.photoUrls.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {(memory.videoUrls?.length || 0) > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="videocam" size={24} color="#9370DB" />
              <Text style={styles.statText}>
                {memory.videoUrls!.length} video{memory.videoUrls!.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fullscreen Media Modal */}
      <Modal
        visible={fullscreenMedia !== null}
        transparent={true}
        onRequestClose={() => setFullscreenMedia(null)}
        animationType="fade"
      >
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setFullscreenMedia(null)}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          {fullscreenMedia?.type === "photo" ? (
            <Image
              source={{ uri: fullscreenMedia.url }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : (
            <Video
              source={{ uri: fullscreenMedia?.url || "" }}
              style={styles.fullscreenVideo}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              useNativeControls={true}
              isLooping={false}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F3FF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  content: {
    flex: 1,
  },
  mediaGrid: {
    padding: 16,
    gap: 12,
  },
  emptyMedia: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyMediaIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyMediaText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  mediaItem: {
    width: "100%",
    height: SCREEN_WIDTH - 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 16,
  },
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  tagsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  tagsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#F0E6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9370DB",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenVideo: {
    width: "100%",
    height: "100%",
  },
});
