import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { MOOD_OPTIONS } from '../../../shared/types';
import type { MoodType } from '../../../shared/types';

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

export default function MoodSelector({ selectedMood, onSelect }: MoodSelectorProps) {
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customMoodText, setCustomMoodText] = useState('');

  const handleCustomMoodSubmit = () => {
    const trimmedMood = customMoodText.trim();
    if (trimmedMood && trimmedMood.length >= 2) {
      onSelect(trimmedMood);
      setCustomModalVisible(false);
      setCustomMoodText('');
    }
  };

  const isCustomMood = selectedMood && !MOOD_OPTIONS.some(m => m.type === selectedMood);

  return (
    <>
      <View style={styles.container}>
        {MOOD_OPTIONS.map((mood) => {
          const isSelected = selectedMood === mood.type;
          return (
            <TouchableOpacity
              key={mood.type}
              testID={`mood-button-${mood.type}`}
              accessibilityLabel={`${mood.label} mood`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.moodButton,
                isSelected && styles.moodButtonSelected,
              ]}
              onPress={() => onSelect(mood.type)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{mood.emoji}</Text>
              <Text style={[styles.label, isSelected && styles.labelSelected]}>
                {mood.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Custom mood button */}
        <TouchableOpacity
          testID="mood-button-custom"
          accessibilityLabel={isCustomMood ? `Custom mood: ${selectedMood}` : 'Enter custom mood'}
          accessibilityRole="button"
          accessibilityState={{ selected: !!isCustomMood }}
          accessibilityHint="Opens a text input to enter your own mood"
          style={[
            styles.moodButton,
            isCustomMood && styles.moodButtonSelected,
          ]}
          onPress={() => setCustomModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.emoji}>✏️</Text>
          <Text
            style={[styles.label, isCustomMood && styles.labelSelected]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {isCustomMood ? selectedMood : 'Custom'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom mood input modal */}
      <Modal
        visible={customModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter your mood</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., anxious, hopeful, grateful..."
              value={customMoodText}
              onChangeText={setCustomMoodText}
              onSubmitEditing={handleCustomMoodSubmit}
              returnKeyType="done"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
              accessibilityLabel="Custom mood input"
              accessibilityHint="Enter your mood, at least 2 characters"
            />
            <Text style={styles.modalHelper}>
              At least 2 characters, up to 50
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setCustomModalVisible(false);
                  setCustomMoodText('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonSubmit,
                  (!customMoodText.trim() || customMoodText.trim().length < 2) && styles.modalButtonDisabled
                ]}
                onPress={handleCustomMoodSubmit}
                disabled={!customMoodText.trim() || customMoodText.trim().length < 2}
              >
                <Text style={styles.modalButtonTextSubmit}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  moodButton: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  moodButtonSelected: {
    borderColor: '#D946A6',
    backgroundColor: '#FFF5F7',
  },
  emoji: {
    fontSize: 32,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  labelSelected: {
    color: '#D946A6',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  modalHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: -12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonSubmit: {
    backgroundColor: '#D946A6',
  },
  modalButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  modalButtonTextCancel: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSubmit: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
