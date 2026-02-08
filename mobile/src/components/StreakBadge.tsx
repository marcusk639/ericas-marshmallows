import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreakBadgeProps {
  streak: number;
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.label}>day streak</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  emoji: {
    fontSize: 20,
  },
  count: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#D946A6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
});
