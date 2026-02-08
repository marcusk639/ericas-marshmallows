import React, { useEffect, useState, useMemo } from 'react';
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
} from 'react-native';
import { useMemories, useMemoryTags } from '../hooks/useMemories';
import { MemoryCard } from '../components/MemoryCard';
import { AddMemoryModal } from '../components/AddMemoryModal';
import { getCurrentUser, getUserProfile } from '../services/auth';
import type { WithId, Memory } from '../../../shared/types';

export default function MemoriesScreen() {
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
      selectedTags.every((tag) => memory.tags.includes(tag))
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
      Alert.alert('No Memories', 'Add some memories to use this feature!');
      return;
    }

    const randomIndex = Math.floor(Math.random() * filteredMemories.length);
    const randomMemory = filteredMemories[randomIndex];

    Alert.alert(
      randomMemory.title,
      randomMemory.description || 'A special memory',
      [{ text: 'OK' }]
    );
  };

  const handleMemoryPress = (memory: WithId<Memory>) => {
    // For now, just show an alert with the memory details
    Alert.alert(
      memory.title,
      memory.description || 'No description',
      [{ text: 'OK' }]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleModalSuccess = () => {
    refresh(); // Reload memories after creating a new one
  };

  // Show loading state
  if (loading && memories.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#D946A6" />
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
        {/* Random Memory Button */}
        <TouchableOpacity
          style={styles.randomButton}
          onPress={handleRandomMemory}
          activeOpacity={0.7}
        >
          <Text style={styles.randomButtonIcon}>🎲</Text>
          <Text style={styles.randomButtonText}>Random Memory</Text>
        </TouchableOpacity>

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
                    style={[styles.filterTag, isSelected && styles.filterTagSelected]}
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
              tintColor="#D946A6"
              colors={['#D946A6']}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F7',
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
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#D946A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  randomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE7F3',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  randomButtonIcon: {
    fontSize: 20,
  },
  randomButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D946A6',
  },
  filtersSection: {
    paddingHorizontal: 16,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#D946A6',
    fontWeight: '600',
  },
  tagsScroll: {
    marginTop: 4,
  },
  tagsScrollContent: {
    paddingRight: 16,
  },
  filterTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  filterTagSelected: {
    backgroundColor: '#D946A6',
  },
  filterTagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTagTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100, // Extra padding for FAB
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D946A6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#D946A6',
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
