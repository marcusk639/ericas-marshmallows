import React, { useState } from 'react';
import {
  View,
  Modal,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSendMarshmallow } from '../hooks/useMarshmallows';
import { useQuickPicks } from '../hooks/useQuickPicks';

type ModalMode = 'choose' | 'custom' | 'quick-pick';

interface SendMarshmallowModalProps {
  visible: boolean;
  onClose: () => void;
  recipientId: string;
  coupleId: string | null;
  senderId: string | null;
}

export const SendMarshmallowModal: React.FC<SendMarshmallowModalProps> = ({
  visible,
  onClose,
  recipientId,
  coupleId,
  senderId,
}) => {
  const [mode, setMode] = useState<ModalMode>('choose');
  const [customMessage, setCustomMessage] = useState('');
  const { sendMarshmallow, sending } = useSendMarshmallow(coupleId, senderId);
  const { quickPicks, loading: loadingQuickPicks } = useQuickPicks();

  const handleClose = () => {
    // Reset state when closing
    setMode('choose');
    setCustomMessage('');
    onClose();
  };

  const handleSendCustom = async () => {
    if (!customMessage.trim()) {
      return;
    }

    try {
      await sendMarshmallow(recipientId, customMessage, 'custom');
      handleClose();
    } catch (error) {
      console.error('Error sending custom marshmallow:', error);
    }
  };

  const handleSendQuickPick = async (message: string) => {
    try {
      await sendMarshmallow(recipientId, message, 'quick-pick', {
        quickPickId: message, // Using message as ID for simplicity
      });
      handleClose();
    } catch (error) {
      console.error('Error sending quick pick marshmallow:', error);
    }
  };

  const renderChooseMode = () => (
    <View style={styles.modeContainer}>
      <Text style={styles.title}>Send a Marshmallow</Text>
      <Text style={styles.subtitle}>Choose how you'd like to send love</Text>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setMode('custom')}
        disabled={sending}
      >
        <Text style={styles.optionEmoji}>✍️</Text>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Custom Message</Text>
          <Text style={styles.optionDescription}>Write your own sweet message</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => setMode('quick-pick')}
        disabled={sending}
      >
        <Text style={styles.optionEmoji}>💕</Text>
        <View style={styles.optionTextContainer}>
          <Text style={styles.optionTitle}>Quick Pick</Text>
          <Text style={styles.optionDescription}>Choose from preset messages</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={sending}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCustomMode = () => (
    <View style={styles.modeContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('choose')}
        disabled={sending}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Custom Message</Text>
      <Text style={styles.subtitle}>Write something sweet</Text>

      <TextInput
        style={styles.textInput}
        placeholder="Type your message here..."
        placeholderTextColor="#D1D5DB"
        value={customMessage}
        onChangeText={setCustomMessage}
        multiline
        maxLength={500}
        editable={!sending}
        autoFocus
      />

      <Text style={styles.characterCount}>
        {customMessage.length}/500
      </Text>

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!customMessage.trim() || sending) && styles.sendButtonDisabled,
        ]}
        onPress={handleSendCustom}
        disabled={!customMessage.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.sendButtonText}>Send Marshmallow</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={sending}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQuickPickMode = () => (
    <View style={styles.modeContainer}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('choose')}
        disabled={sending}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Quick Pick</Text>
      <Text style={styles.subtitle}>Choose a preset message</Text>

      {loadingQuickPicks ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D946A6" />
          <Text style={styles.loadingText}>Loading quick picks...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.quickPickScrollView}
          showsVerticalScrollIndicator={false}
        >
          {quickPicks.map((quickPick) => (
            <TouchableOpacity
              key={quickPick.id}
              style={styles.quickPickButton}
              onPress={() => handleSendQuickPick(quickPick.message)}
              disabled={sending}
            >
              <Text style={styles.quickPickEmoji}>{quickPick.emoji}</Text>
              <Text style={styles.quickPickText}>{quickPick.message}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        disabled={sending}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={handleClose}
          disabled={sending}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {mode === 'choose' && renderChooseMode()}
            {mode === 'custom' && renderCustomMode()}
            {mode === 'quick-pick' && renderQuickPickMode()}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    maxHeight: '80%',
  },
  modeContainer: {
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#D946A6',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D946A6',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FED7E2',
  },
  optionEmoji: {
    fontSize: 36,
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D946A6',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  textInput: {
    backgroundColor: '#FFF5F7',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#FED7E2',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#D946A6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#FED7E2',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  quickPickScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  quickPickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FED7E2',
  },
  quickPickEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  quickPickText: {
    fontSize: 18,
    color: '#D946A6',
    fontWeight: '600',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
