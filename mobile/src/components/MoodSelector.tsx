import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MOOD_OPTIONS } from '../../../shared/types';
import type { MoodType } from '../../../shared/types';

interface MoodSelectorProps {
  selectedMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

export default function MoodSelector({ selectedMood, onSelect }: MoodSelectorProps) {
  return (
    <View style={styles.container}>
      {MOOD_OPTIONS.map((mood) => {
        const isSelected = selectedMood === mood.type;
        return (
          <TouchableOpacity
            key={mood.type}
            testID={`mood-button-${mood.type}`}
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
    </View>
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
  },
  labelSelected: {
    color: '#D946A6',
    fontWeight: '700',
  },
});
