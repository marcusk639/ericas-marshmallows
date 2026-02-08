import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

interface GratitudeInputProps {
  value: string;
  onChange: (text: string) => void;
}

export default function GratitudeInput({ value, onChange }: GratitudeInputProps) {
  const maxLength = 500;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="What are you grateful for today?"
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={4}
        maxLength={maxLength}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
