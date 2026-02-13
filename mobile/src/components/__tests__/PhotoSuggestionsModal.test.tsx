/**
 * Tests for PhotoSuggestionsModal component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PhotoSuggestionsModal } from '../PhotoSuggestionsModal';
import type { PhotoSuggestion } from '../../services/photoAnalysis';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('PhotoSuggestionsModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSelectPhotos = jest.fn();

  const mockSuggestions: PhotoSuggestion[] = [
    {
      uri: 'photo1.jpg',
      id: '1',
      creationTime: Date.now(),
      width: 1920,
      height: 1080,
      hasPeople: true,
      hasGoldenRetriever: false,
      description: 'Two people at park',
      confidence: 'high',
    },
    {
      uri: 'photo2.jpg',
      id: '2',
      creationTime: Date.now() - 1000,
      width: 1920,
      height: 1080,
      hasPeople: false,
      hasGoldenRetriever: true,
      description: 'Golden retriever playing',
      confidence: 'high',
    },
    {
      uri: 'photo3.jpg',
      id: '3',
      creationTime: Date.now() - 2000,
      width: 1920,
      height: 1080,
      hasPeople: true,
      hasGoldenRetriever: true,
      description: 'Person with golden retriever',
      confidence: 'medium',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state when loading is true', () => {
    const { getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={[]}
        onSelectPhotos={mockOnSelectPhotos}
        loading={true}
      />
    );

    expect(getByText(/scanning your photos/i)).toBeTruthy();
    expect(
      getByText(/looking for photos of you, your partner, and your golden retriever/i)
    ).toBeTruthy();
  });

  it('should render progress information when loading with progress', () => {
    const progress = { current: 25, total: 50, status: 'Analyzing photo 25 of 50...' };

    const { getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={[]}
        onSelectPhotos={mockOnSelectPhotos}
        loading={true}
        progress={progress}
      />
    );

    expect(getByText('Analyzing photo 25 of 50...')).toBeTruthy();
    expect(getByText('25 of 50 photos analyzed')).toBeTruthy();
  });

  it('should render empty state when no suggestions', () => {
    const { getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={[]}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    expect(getByText('No suggestions found')).toBeTruthy();
    expect(
      getByText(/try taking some photos together or with your golden retriever/i)
    ).toBeTruthy();
  });

  it('should render photo grid when suggestions are provided', () => {
    const { getAllByRole } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={mockSuggestions}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    // Should render 3 photos
    const images = getAllByRole('image');
    expect(images).toHaveLength(3);
  });

  it('should handle photo selection', () => {
    const { getAllByTestId, getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={mockSuggestions}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    // Initially, Create button should show (0)
    expect(getByText('Create (0)')).toBeTruthy();

    // Select first photo
    const photoButtons = getAllByTestId(/photo-wrapper/i);
    if (photoButtons.length > 0) {
      fireEvent.press(photoButtons[0]);

      // Should update count
      expect(getByText('Create (1)')).toBeTruthy();
    }
  });

  it('should limit selection to 5 photos', () => {
    const manyPhotos = Array.from({ length: 10 }, (_, i) => ({
      uri: `photo${i}.jpg`,
      id: `${i}`,
      creationTime: Date.now() - i * 1000,
      width: 1920,
      height: 1080,
      hasPeople: true,
      hasGoldenRetriever: false,
      description: 'Photo',
      confidence: 'high' as const,
    }));

    const { getAllByTestId } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={manyPhotos}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    const photoButtons = getAllByTestId(/photo-wrapper/i);

    // Try to select 6 photos
    for (let i = 0; i < 6; i++) {
      if (photoButtons[i]) {
        fireEvent.press(photoButtons[i]);
      }
    }

    // Should show alert for 6th photo
    expect(Alert.alert).toHaveBeenCalledWith(
      'Limit Reached',
      'You can select up to 5 photos at a time.'
    );
  });

  it('should call onSelectPhotos when Create button is pressed', () => {
    const { getAllByTestId, getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={mockSuggestions}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    // Select two photos
    const photoButtons = getAllByTestId(/photo-wrapper/i);
    if (photoButtons.length >= 2) {
      fireEvent.press(photoButtons[0]);
      fireEvent.press(photoButtons[1]);

      // Press Create button
      const createButton = getByText('Create (2)');
      fireEvent.press(createButton);

      expect(mockOnSelectPhotos).toHaveBeenCalledWith(['photo1.jpg', 'photo2.jpg']);
    }
  });

  it('should show alert when trying to create with no photos selected', () => {
    const { getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={mockSuggestions}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    // Try to press Create with no selection
    const createButton = getByText('Create (0)');
    fireEvent.press(createButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'No Photos Selected',
      'Please select at least one photo.'
    );
  });

  it('should call onClose and reset selection when Cancel is pressed', () => {
    const { getAllByTestId, getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={mockSuggestions}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    // Select a photo
    const photoButtons = getAllByTestId(/photo-wrapper/i);
    if (photoButtons.length > 0) {
      fireEvent.press(photoButtons[0]);
    }

    // Press Cancel
    const cancelButton = getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should toggle photo selection on/off', () => {
    const { getAllByTestId, getByText } = render(
      <PhotoSuggestionsModal
        visible={true}
        onClose={mockOnClose}
        suggestions={mockSuggestions}
        onSelectPhotos={mockOnSelectPhotos}
        loading={false}
      />
    );

    const photoButtons = getAllByTestId(/photo-wrapper/i);

    if (photoButtons.length > 0) {
      // Select photo
      fireEvent.press(photoButtons[0]);
      expect(getByText('Create (1)')).toBeTruthy();

      // Deselect photo
      fireEvent.press(photoButtons[0]);
      expect(getByText('Create (0)')).toBeTruthy();
    }
  });
});
