import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime: string; // Format: "HH:MM"
  onConfirm: (time: string) => void;
  onCancel: () => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title,
  initialTime,
  onConfirm,
  onCancel,
}) => {
  const [time, setTime] = useState(() => {
    const [hours, minutes] = initialTime.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    return date;
  });

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        onCancel();
        return;
      }
      if (selectedDate) {
        const timeString = formatTime(selectedDate);
        onConfirm(timeString);
      }
    } else if (selectedDate) {
      setTime(selectedDate);
    }
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleConfirm = () => {
    const timeString = formatTime(time);
    onConfirm(timeString);
  };

  if (Platform.OS === 'android') {
    return visible ? (
      <DateTimePicker
        value={time}
        mode="time"
        is24Hour={true}
        display="default"
        onChange={handleTimeChange}
      />
    ) : null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalContent}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>

          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={handleTimeChange}
            style={styles.picker}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
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
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D946A6',
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#D946A6',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
