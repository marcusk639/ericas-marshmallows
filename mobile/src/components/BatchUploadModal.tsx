import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  batchUploadFromAlbum,
  type BatchUploadProgress,
} from '../utils/batchMemoryUpload';

interface BatchUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  coupleId: string | null;
  userId: string | null;
}

export const BatchUploadModal: React.FC<BatchUploadModalProps> = ({
  visible,
  onClose,
  onSuccess,
  coupleId,
  userId,
}) => {
  const [albumName, setAlbumName] = useState('');
  const [analyzeMedia, setAnalyzeMedia] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<BatchUploadProgress | null>(null);

  const handleStartUpload = async () => {
    if (!albumName.trim()) {
      Alert.alert('Album Name Required', 'Please enter the name of your photo album.');
      return;
    }

    if (!coupleId || !userId) {
      Alert.alert('Error', 'You must be signed in to upload memories.');
      return;
    }

    Alert.alert(
      'Confirm Batch Upload',
      `This will create memories from all photos/videos in the "${albumName}" album. This may take a while and will use your Claude API credits. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Upload',
          style: 'default',
          onPress: async () => {
            setUploading(true);
            setProgress(null);

            try {
              const result = await batchUploadFromAlbum({
                albumName: albumName.trim(),
                coupleId,
                userId,
                analyzeMedia,
                onProgress: (p) => {
                  setProgress(p);
                },
                onError: (error, item) => {
                  console.error(`Error with ${item}:`, error.message);
                },
              });

              setUploading(false);
              Alert.alert(
                'Upload Complete!',
                `Successfully created ${result.memoriesCreated} memories.\n${result.errors.length} errors occurred.`,
                [{ text: 'OK', onPress: () => onSuccess(result.memoriesCreated) }]
              );
            } catch (error) {
              setUploading(false);
              console.error('Batch upload failed:', error);
              Alert.alert(
                'Upload Failed',
                error instanceof Error ? error.message : 'An error occurred during upload.'
              );
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    if (uploading) {
      Alert.alert(
        'Upload in Progress',
        'Please wait for the upload to complete before closing.'
      );
      return;
    }
    setAlbumName('');
    setProgress(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={uploading}>
            <Text style={[styles.cancelButton, uploading && styles.disabledText]}>
              {uploading ? '' : 'Close'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Batch Upload</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Instructions */}
          <View style={styles.section}>
            <View style={styles.iconRow}>
              <Ionicons name="information-circle" size={24} color="#9370DB" />
              <Text style={styles.infoTitle}>Batch Import Memories</Text>
            </View>
            <Text style={styles.infoText}>
              Import all photos and videos from a specific album on your iPhone and create
              memories automatically. Items from the same day will be grouped together.
            </Text>
          </View>

          {/* Album Name Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Album Name</Text>
            <TextInput
              style={styles.input}
              value={albumName}
              onChangeText={setAlbumName}
              placeholder='e.g., "Us Together" or "Couple Photos"'
              placeholderTextColor="#9CA3AF"
              editable={!uploading}
              autoCapitalize="words"
            />
            <Text style={styles.hint}>
              Enter the exact name of your photo album (case-insensitive)
            </Text>
          </View>

          {/* Analysis Toggle */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setAnalyzeMedia(!analyzeMedia)}
              disabled={uploading}
            >
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleLabel}>Analyze Photos/Videos</Text>
                <Text style={styles.toggleHint}>
                  Only import media with you, your partner, or your golden retriever
                </Text>
              </View>
              <View style={[styles.toggle, analyzeMedia && styles.toggleActive]}>
                {analyzeMedia && <View style={styles.toggleDot} />}
              </View>
            </TouchableOpacity>
          </View>

          {/* Cost Warning */}
          {analyzeMedia && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Analysis uses Claude API credits. Estimated cost: ~$0.02 per photo/video.
              </Text>
            </View>
          )}

          {/* Progress */}
          {uploading && progress && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>Upload Progress</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(progress.processed / progress.total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {progress.processed} / {progress.total} groups processed
              </Text>
              <Text style={styles.progressStatus}>{progress.status}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{progress.created}</Text>
                  <Text style={styles.statLabel}>Created</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{progress.failed}</Text>
                  <Text style={styles.statLabel}>Failed</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {progress.total - progress.processed}
                  </Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>
            </View>
          )}

          {/* Start Button */}
          {!uploading && (
            <TouchableOpacity
              style={[styles.startButton, !albumName.trim() && styles.disabledButton]}
              onPress={handleStartUpload}
              disabled={!albumName.trim()}
            >
              <Text style={styles.startButtonText}>Start Batch Upload</Text>
            </TouchableOpacity>
          )}

          {/* Loading Indicator */}
          {uploading && !progress && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#9370DB" />
              <Text style={styles.loadingText}>Finding album and preparing upload...</Text>
            </View>
          )}
        </ScrollView>
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
    borderBottomColor: '#E5E7EB',
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
  disabledText: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
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
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  toggleLeft: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  toggleHint: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#9370DB',
    alignItems: 'flex-end',
  },
  toggleDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    marginLeft: 8,
    lineHeight: 18,
  },
  progressSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#9370DB',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  progressStatus: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9370DB',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#9370DB',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.4,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
});
