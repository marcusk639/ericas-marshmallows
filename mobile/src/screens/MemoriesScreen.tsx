import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useMemories, useMemoryTags } from "../hooks/useMemories";
import { MemoryCard } from "../components/MemoryCard";
import { AddMemoryModal } from "../components/AddMemoryModal";
import { PhotoSuggestionsModal } from "../components/PhotoSuggestionsModal";
import { BatchUploadModal } from "../components/BatchUploadModal";
import { getCurrentUser, getUserProfile } from "../services/auth";
import {
  scanForMemorySuggestions,
  type PhotoSuggestion,
} from "../services/photoAnalysis";
import type { WithId, Memory } from "../../../shared/types";

interface MemoriesScreenProps {
  navigation: any;
}

export default function MemoriesScreen({ navigation }: MemoriesScreenProps) {
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [suggestionsModalVisible, setSuggestionsModalVisible] = useState(false);
  const [photoSuggestions, setPhotoSuggestions] = useState<PhotoSuggestion[]>(
    [],
  );
  const [scanningPhotos, setScanningPhotos] = useState(false);
  const [scanProgress, setScanProgress] = useState({
    current: 0,
    total: 0,
    status: "",
  });
  const [preselectedPhotos, setPreselectedPhotos] = useState<string[]>([]);
  const [batchUploadModalVisible, setBatchUploadModalVisible] = useState(false);

  const { memories, loading, refresh } = useMemories(coupleId);
  const allTags = useMemoryTags(memories);

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

  // Filter memories by selected tags
  const filteredMemories = useMemo(() => {
    if (selectedTags.length === 0) {
      return memories;
    }

    return memories.filter((memory) =>
      selectedTags.every((tag) => memory.tags.includes(tag)),
    );
  }, [memories, selectedTags]);

  const handleTagPress = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
  };

  const handleRandomMemory = () => {
    if (filteredMemories.length === 0) {
      Alert.alert("No Memories", "Add some memories to use this feature!");
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredMemories.length);
    const randomMemory = filteredMemories[randomIndex];

    Alert.alert(
      randomMemory.title,
      randomMemory.description || "A special memory",
      [{ text: "OK" }],
    );
  };

  const handleMemoryPress = (memory: WithId<Memory>) => {
    navigation.navigate("MemoryDetail", { memory });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleModalSuccess = () => {
    refresh(); // Reload memories after creating a new one
    setPreselectedPhotos([]); // Clear preselected photos
  };

  const handleScanPhotos = async () => {
    try {
      setScanningPhotos(true);
      setScanProgress({ current: 0, total: 0, status: "Starting scan..." });
      setSuggestionsModalVisible(true);

      // Scan the photo library for suggestions with progress tracking
      const suggestions = await scanForMemorySuggestions(
        100,
        (current, total, status) => {
          setScanProgress({ current, total, status });
        },
      );

      setPhotoSuggestions(suggestions);

      if (suggestions.length === 0) {
        Alert.alert(
          "No Suggestions",
          "No photos found with people or golden retrievers. The scan looked through your recent photos.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      console.error("Error scanning photos:", error);
      Alert.alert(
        "Scan Error",
        "Could not scan photos. Please check permissions and try again.",
        [{ text: "OK" }],
      );
      setSuggestionsModalVisible(false);
    } finally {
      setScanningPhotos(false);
      setScanProgress({ current: 0, total: 0, status: "" });
    }
  };

  const handlePhotosSelected = (photoUris: string[]) => {
    // Close suggestions modal and open add memory modal with preselected photos
    setSuggestionsModalVisible(false);
    setPreselectedPhotos(photoUris);
    setModalVisible(true);
  };

  const handleCloseSuggestions = () => {
    setSuggestionsModalVisible(false);
    setPhotoSuggestions([]);
  };

  const handleCloseAddMemory = () => {
    setModalVisible(false);
    setPreselectedPhotos([]);
  };

  // Show loading state
  if (loading && memories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#9370DB" />
        <Text style={styles.loadingText}>Loading memories...</Text>
      </View>
    );
  }

  // Show empty state
  if (memories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📸</Text>
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptySubtitle}>
            Start capturing your special moments together!
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.emptyButtonText}>Create First Memory</Text>
          </TouchableOpacity>
        </View>

        {/* Add Memory Modal */}
        <AddMemoryModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={handleModalSuccess}
          coupleId={coupleId}
          userId={currentUserId}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleScanPhotos}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>🔍</Text>
            <Text style={styles.actionButtonText}>Scan Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRandomMemory}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>🎲</Text>
            <Text style={styles.actionButtonText}>Random Memory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setBatchUploadModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonIcon}>📤</Text>
            <Text style={styles.actionButtonText}>Batch Import</Text>
          </TouchableOpacity>
        </View>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <View style={styles.filtersSection}>
            <View style={styles.filtersHeader}>
              <Text style={styles.filtersTitle}>Filter by tags</Text>
              {selectedTags.length > 0 && (
                <TouchableOpacity onPress={handleClearFilters}>
                  <Text style={styles.clearFiltersText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tagsScroll}
              contentContainerStyle={styles.tagsScrollContent}
            >
              {allTags.map((tag, index) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterTag,
                      isSelected && styles.filterTagSelected,
                    ]}
                    onPress={() => handleTagPress(tag)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterTagText,
                        isSelected && styles.filterTagTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Memories List */}
      {filteredMemories.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No matching memories</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your filters or create a new memory
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMemories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemoryCard memory={item} onPress={handleMemoryPress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#9370DB"
              colors={["#9370DB"]}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Photo Suggestions Modal */}
      <PhotoSuggestionsModal
        visible={suggestionsModalVisible}
        onClose={handleCloseSuggestions}
        suggestions={photoSuggestions}
        onSelectPhotos={handlePhotosSelected}
        loading={scanningPhotos}
        progress={scanProgress}
      />

      {/* Add Memory Modal */}
      <AddMemoryModal
        visible={modalVisible}
        onClose={handleCloseAddMemory}
        onSuccess={handleModalSuccess}
        coupleId={coupleId}
        userId={currentUserId}
        preselectedPhotoUris={preselectedPhotos}
      />

      {/* Batch Upload Modal */}
      <BatchUploadModal
        visible={batchUploadModalVisible}
        onClose={() => setBatchUploadModalVisible(false)}
        onSuccess={(count) => {
          setBatchUploadModalVisible(false);
          refresh();
          Alert.alert('Success', `Created ${count} memories from your album!`);
        }}
        coupleId={coupleId}
        userId={currentUserId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F3FF",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#9370DB",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#9370DB",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  headerSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0E6FF",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#9370DB",
  },
  filtersSection: {
    paddingHorizontal: 16,
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  clearFiltersText: {
    fontSize: 14,
    color: "#9370DB",
    fontWeight: "600",
  },
  tagsScroll: {
    marginTop: 4,
  },
  tagsScrollContent: {
    paddingRight: 16,
  },
  filterTag: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  filterTagSelected: {
    backgroundColor: "#9370DB",
  },
  filterTagText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterTagTextSelected: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100, // Extra padding for FAB
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#9370DB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#9370DB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: "#FFFFFF",
    fontWeight: "bold",
    lineHeight: 32,
  },
});
