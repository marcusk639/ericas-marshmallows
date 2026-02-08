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
import { useCreateMemory } from '../hooks/useMemories';

interface AddMemoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coupleId: string | null;
  userId: string | null;
}

export const AddMemoryModal: React.FC<AddMemoryModalProps> = ({
  visible,
  onClose,
  onSuccess,
  coupleId,
  userId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());

  const { createMemory, creating, uploadProgress } = useCreateMemory(coupleId, userId);

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

  const handlePickImages = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - photoUris.length, // Limit total to 5 photos
      });

      if (!result.canceled && result.assets) {
        const newUris = result.assets.map((asset) => asset.uri);
        setPhotoUris([...photoUris, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUris(photoUris.filter((_, i) => i !== index));
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

    if (photoUris.length === 0) {
      Alert.alert('No Photos', 'Please add at least one photo to this memory.');
      return;
    }

    try {
      await createMemory(title.trim(), description.trim(), photoUris, tags, date);

      // Reset form
      setTitle('');
      setDescription('');
      setTagInput('');
      setTags([]);
      setPhotoUris([]);
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
    setPhotoUris([]);
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
          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
            >
              {photoUris.map((uri, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                    disabled={creating}
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {photoUris.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={handlePickImages}
                  disabled={creating}
                >
                  <Text style={styles.addPhotoIcon}>+</Text>
                  <Text style={styles.addPhotoText}>Add Photo</Text>
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
            <ActivityIndicator size="small" color="#D946A6" />
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
    backgroundColor: '#FFF5F7',
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
    color: '#D946A6',
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
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D946A6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FCE7F3',
  },
  addPhotoIcon: {
    fontSize: 32,
    color: '#D946A6',
    marginBottom: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: '#D946A6',
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
    backgroundColor: '#D946A6',
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
    backgroundColor: '#FCE7F3',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: '#D946A6',
    fontSize: 14,
    fontWeight: '600',
  },
  removeTagText: {
    color: '#D946A6',
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
    backgroundColor: '#D946A6',
    borderRadius: 2,
  },
});
