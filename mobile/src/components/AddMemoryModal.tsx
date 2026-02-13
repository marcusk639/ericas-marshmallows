import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useCreateMemory } from '../hooks/useMemories';

export interface MediaItem {
  uri: string;
  type: 'photo' | 'video';
}

interface AddMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coupleId: string | null;
  userId: string | null;
  preselectedPhotoUris?: string[];
}

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  coupleId,
  userId,
  preselectedPhotoUris = [],
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [date, setDate] = useState(new Date());

  const { createMemory, creating, uploadProgress } = useCreateMemory(coupleId, userId);

  // Set preselected photos when they're provided
  React.useEffect(() => {
    if (preselectedPhotoUris.length > 0) {
      setMediaItems(preselectedPhotoUris.map(uri => ({ uri, type: 'photo' as const })));
    }
  }, [preselectedPhotoUris]);

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library permission to add photos to your memories.'
        );
        return false;
      }
    }
    return true;
  };

  const handlePickMedia = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - mediaItems.length, // Limit total to 5 items
        videoMaxDuration: 60, // Limit videos to 60 seconds
      });

      if (!result.canceled && result.assets) {
        const newItems: MediaItem[] = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'photo',
        }));
        setMediaItems([...mediaItems, ...newItems]);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant camera permission to take photos.'
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setMediaItems([...mediaItems, {
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' : 'photo',
        }]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleAddMediaOptions = () => {
    Alert.alert(
      'Add Photo/Video',
      'Choose where to add media from',
      [
        {
          text: 'Take Photo/Video',
          onPress: handleTakePhoto,
        },
        {
          text: 'Choose from Library',
          onPress: handlePickMedia,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoveMedia = (index: number) => {
    setMediaItems(mediaItems.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for this memory.');
      return;
    }

    if (mediaItems.length === 0) {
      Alert.alert('No Media', 'Please add at least one photo or video to this memory.');
      return;
    }

    try {
      const photoUris = mediaItems.filter(item => item.type === 'photo').map(item => item.uri);
      const videoUris = mediaItems.filter(item => item.type === 'video').map(item => item.uri);

      await createMemory(title.trim(), description.trim(), photoUris, videoUris, tags, date);

      // Reset form
      setTitle('');
      setDescription('');
      setTagInput('');
      setTags([]);
      setMediaItems([]);
      setDate(new Date());

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating memory:', error);
      Alert.alert('Error', 'Failed to create memory. Please try again.');
    }
  };

  const handleCancel = () => {
    if (creating) return; // Don't allow cancel during upload

    // Reset form
    setTitle('');
    setDescription('');
    setTagInput('');
    setTags([]);
    setMediaItems([]);
    setDate(new Date());

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
          <TouchableOpacity onPress={handleCancel} disabled={creating}>
            <Text style={[styles.cancelButton, creating && styles.disabledButton]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Memory</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={creating || !title.trim()}>
            <Text
              style={[
                styles.saveButton,
                (creating || !title.trim()) && styles.disabledButton,
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Media Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos & Videos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
            >
              {mediaItems.map((item, index) => (
                <View key={index} style={styles.photoWrapper}>
                  {item.type === 'photo' ? (
                    <Image source={{ uri: item.uri }} style={styles.photo} />
                  ) : (
                    <View style={styles.videoContainer}>
                      <Video
                        source={{ uri: item.uri }}
                        style={styles.photo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        useNativeControls={false}
                      />
                      <View style={styles.videoOverlay}>
                        <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
                      </View>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemoveMedia(index)}
                    disabled={creating}
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {mediaItems.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={handleAddMediaOptions}
                  disabled={creating}
                >
                  <Text style={styles.addPhotoIcon}>+</Text>
                  <Text style={styles.addPhotoText}>Add Media</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Give this memory a title"
              placeholderTextColor="#9CA3AF"
              editable={!creating}
            />
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add some details about this memory..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!creating}
            />
          </View>

          {/* Tags Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
                editable={!creating}
              />
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={handleAddTag}
                disabled={creating || !tagInput.trim()}
              >
                <Text style={styles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveTag(tag)}
                      disabled={creating}
                    >
                      <Text style={styles.removeTagText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Date Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date</Text>
            <Text style={styles.dateText}>
              {date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
        </ScrollView>

        {/* Upload Progress */}
        {creating && (
          <View style={styles.uploadProgress}>
            <ActivityIndicator size="small" color="#9370DB" />
            <Text style={styles.uploadProgressText}>
              Uploading... {Math.round(uploadProgress * 100)}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress * 100}%` }]}
              />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9370DB',
  },
  disabledButton: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  photosScroll: {
    marginTop: 8,
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoContainer: {
    position: 'relative',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#9370DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0E6FF',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: '#9370DB',
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#9370DB',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  addTagButton: {
    backgroundColor: '#9370DB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E6FF',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: '#9370DB',
    fontSize: 14,
    fontWeight: '600',
  },
  removeTagText: {
    color: '#9370DB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
  },
  uploadProgress: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  uploadProgressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9370DB',
    borderRadius: 2,
  },
});
