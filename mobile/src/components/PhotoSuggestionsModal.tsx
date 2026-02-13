import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import type { PhotoSuggestion } from '../services/photoAnalysis';

interface PhotoSuggestionsModalProps {
  visible: boolean;
  onClose: () => void;
  suggestions: PhotoSuggestion[];
  onSelectPhotos: (photoUris: string[]) => void;
  loading: boolean;
  progress?: { current: number; total: number; status: string };
}

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3; // 3 columns with padding

export const PhotoSuggestionsModal: React.FC<PhotoSuggestionsModalProps> = ({
  visible,
  onClose,
  suggestions,
  onSelectPhotos,
  loading,
  progress,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

  const handleTogglePhoto = (uri: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(uri)) {
      newSelected.delete(uri);
    } else {
      if (newSelected.size >= 5) {
        Alert.alert('Limit Reached', 'You can select up to 5 photos at a time.');
        return;
      }
      newSelected.add(uri);
    }
    setSelectedPhotos(newSelected);
  };

  const handleCreateMemory = () => {
    if (selectedPhotos.size === 0) {
      Alert.alert('No Photos Selected', 'Please select at least one photo.');
      return;
    }

    onSelectPhotos(Array.from(selectedPhotos));
    setSelectedPhotos(new Set());
  };

  const handleCancel = () => {
    setSelectedPhotos(new Set());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo Suggestions</Text>
          <TouchableOpacity
            onPress={handleCreateMemory}
            disabled={selectedPhotos.size === 0}
          >
            <Text
              style={[
                styles.createButton,
                selectedPhotos.size === 0 && styles.disabledButton,
              ]}
            >
              Create ({selectedPhotos.size})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#9370DB" />
            <Text style={styles.loadingText}>
              {progress?.status || 'Scanning your photos...'}
            </Text>
            {progress && progress.total > 0 && (
              <Text style={styles.loadingSubtext}>
                {progress.current} of {progress.total} photos analyzed
              </Text>
            )}
            <Text style={styles.loadingSubtext}>
              Looking for photos of you, your partner, and your golden retriever
            </Text>
          </View>
        ) : suggestions.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyTitle}>No suggestions found</Text>
            <Text style={styles.emptySubtitle}>
              Try taking some photos together or with your golden retriever!
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.infoBar}>
              <Text style={styles.infoText}>
                Tap photos to select them (up to 5 at a time)
              </Text>
            </View>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={({ item }) => {
                const isSelected = selectedPhotos.has(item.uri);
                return (
                  <TouchableOpacity
                    testID="photo-wrapper"
                    style={styles.photoWrapper}
                    onPress={() => handleTogglePhoto(item.uri)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: item.uri }} style={styles.photo} />
                    {isSelected && (
                      <View style={styles.selectedOverlay}>
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={styles.listContent}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E6E6FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8BFD8',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9370DB',
  },
  disabledButton: {
    opacity: 0.4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
  infoBar: {
    backgroundColor: '#F0E6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D8BFD8',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 8,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    padding: 4,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    backgroundColor: 'rgba(147, 112, 219, 0.3)',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#9370DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#9370DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
