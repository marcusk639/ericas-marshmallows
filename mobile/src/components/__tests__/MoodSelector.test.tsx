import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoodSelector from '../MoodSelector';
import { MOOD_OPTIONS } from '../../../../shared/types';
import type { MoodType } from '../../../../shared/types';

describe('MoodSelector', () => {
  it('should render all mood options', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <MoodSelector selectedMood={null} onSelect={onSelect} />
    );

    MOOD_OPTIONS.forEach((mood) => {
      expect(getByText(mood.emoji)).toBeTruthy();
      expect(getByText(mood.label)).toBeTruthy();
    });
  });

  it('should call onSelect when mood is pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <MoodSelector selectedMood={null} onSelect={onSelect} />
    );

    const happyMood = getByText('😊');
    fireEvent.press(happyMood);

    expect(onSelect).toHaveBeenCalledWith('happy');
  });

  it('should highlight selected mood', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <MoodSelector selectedMood="happy" onSelect={onSelect} />
    );

    const happyButton = getByTestId('mood-button-happy');
    expect(happyButton.props.style).toContainEqual(
      expect.objectContaining({ borderColor: '#9370DB' })
    );
  });

  it('should not highlight unselected moods', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <MoodSelector selectedMood="happy" onSelect={onSelect} />
    );

    const lovingButton = getByTestId('mood-button-loving');
    expect(lovingButton.props.style).toContainEqual(
      expect.objectContaining({ borderColor: '#E5E7EB' })
    );
  });
});
