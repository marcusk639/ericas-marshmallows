import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import DailyCheckinScreen from '../DailyCheckinScreen';
import * as useDailyCheckinHooks from '../../hooks/useDailyCheckin';
import * as authService from '../../services/auth';
import { MOOD_OPTIONS } from '../../../../shared/types';

// Mock the hooks
jest.mock('../../hooks/useDailyCheckin');
jest.mock('../../services/auth');

describe('DailyCheckinScreen', () => {
  const mockUseDailyCheckin = jest.spyOn(useDailyCheckinHooks, 'useDailyCheckin');
  const mockUseCreateCheckin = jest.spyOn(useDailyCheckinHooks, 'useCreateCheckin');
  const mockUseCheckinStreak = jest.spyOn(useDailyCheckinHooks, 'useCheckinStreak');
  const mockGetCurrentUser = jest.spyOn(authService, 'getCurrentUser');
  const mockGetUserProfile = jest.spyOn(authService, 'getUserProfile');

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockGetCurrentUser.mockReturnValue({ uid: 'user123' } as any);
    mockGetUserProfile.mockResolvedValue({ coupleId: 'couple123' } as any);

    mockUseDailyCheckin.mockReturnValue({
      myCheckin: null,
      partnerCheckin: null,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    mockUseCreateCheckin.mockReturnValue({
      createCheckin: jest.fn(),
      creating: false,
      error: null,
    });

    mockUseCheckinStreak.mockReturnValue({
      streak: 0,
      loading: false,
      error: null,
      refresh: jest.fn(),
    });
  });

  describe('Initial Render', () => {
    it('should render mood selection screen when no check-in today', () => {
      const { getByText } = render(<DailyCheckinScreen />);

      expect(getByText('How are you feeling today?')).toBeTruthy();
    });

    it('should display all 6 mood options', () => {
      const { getByText } = render(<DailyCheckinScreen />);

      MOOD_OPTIONS.forEach((mood) => {
        expect(getByText(mood.emoji)).toBeTruthy();
        expect(getByText(mood.label)).toBeTruthy();
      });
    });

    it('should display current streak count', () => {
      mockUseCheckinStreak.mockReturnValue({
        streak: 5,
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { getByText } = render(<DailyCheckinScreen />);

      expect(getByText('🔥')).toBeTruthy();
      expect(getByText('5')).toBeTruthy();
    });
  });

  describe('Mood Selection and Gratitude Input', () => {
    it('should allow selecting mood and entering gratitude', () => {
      const { getByText, getByPlaceholderText } = render(<DailyCheckinScreen />);

      // Select a mood
      const happyMood = getByText('😊');
      fireEvent.press(happyMood);

      // Enter gratitude
      const gratitudeInput = getByPlaceholderText("What are you grateful for today?");
      fireEvent.changeText(gratitudeInput, 'Grateful for sunshine');

      expect(gratitudeInput.props.value).toBe('Grateful for sunshine');
    });

    it('should show submit button disabled when gratitude is empty', () => {
      const { getByText, getByTestId } = render(<DailyCheckinScreen />);

      // Select a mood
      const happyMood = getByText('😊');
      fireEvent.press(happyMood);

      // Submit button should be disabled
      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should enable submit button when both mood and gratitude are filled', () => {
      const { getByText, getByPlaceholderText, getByTestId } = render(<DailyCheckinScreen />);

      // Select a mood
      const happyMood = getByText('😊');
      fireEvent.press(happyMood);

      // Enter gratitude
      const gratitudeInput = getByPlaceholderText("What are you grateful for today?");
      fireEvent.changeText(gratitudeInput, 'Grateful for sunshine');

      // Submit button should be enabled
      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('Submitting Check-in', () => {
    it('should show loading state while submitting', async () => {
      const createCheckin = jest.fn().mockResolvedValue('checkin123');
      mockUseCreateCheckin.mockReturnValue({
        createCheckin,
        creating: true,
        error: null,
      });

      const { getByTestId } = render(<DailyCheckinScreen />);

      const submitButton = getByTestId('submit-button');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should call createCheckin with correct parameters', async () => {
      const createCheckin = jest.fn().mockResolvedValue('checkin123');
      const refresh = jest.fn();
      const refreshStreak = jest.fn();

      mockUseCreateCheckin.mockReturnValue({
        createCheckin,
        creating: false,
        error: null,
      });

      mockUseDailyCheckin.mockReturnValue({
        myCheckin: null,
        partnerCheckin: null,
        loading: false,
        error: null,
        refresh,
      });

      mockUseCheckinStreak.mockReturnValue({
        streak: 0,
        loading: false,
        error: null,
        refresh: refreshStreak,
      });

      const { getByText, getByPlaceholderText, getByTestId } = render(<DailyCheckinScreen />);

      // Select mood
      fireEvent.press(getByText('😊'));

      // Enter gratitude
      fireEvent.changeText(
        getByPlaceholderText("What are you grateful for today?"),
        'Grateful for sunshine'
      );

      // Submit
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(createCheckin).toHaveBeenCalledWith('happy', undefined, 'Grateful for sunshine');
      });
    });
  });

  describe('Partner Check-in Display', () => {
    it('should show partner mood after both submit', () => {
      mockUseDailyCheckin.mockReturnValue({
        myCheckin: {
          id: 'checkin1',
          userId: 'user123',
          coupleId: 'couple123',
          mood: 'happy',
          gratitude: 'My gratitude',
          date: '2026-02-07',
          createdAt: { seconds: 123, nanoseconds: 0 },
        },
        partnerCheckin: {
          id: 'checkin2',
          userId: 'partner123',
          coupleId: 'couple123',
          mood: 'loving',
          gratitude: 'Partner gratitude',
          date: '2026-02-07',
          createdAt: { seconds: 123, nanoseconds: 0 },
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { getByText } = render(<DailyCheckinScreen />);

      // Should show completion message
      expect(getByText(/checked in today/i)).toBeTruthy();

      // Should show partner's mood emoji
      expect(getByText('💕')).toBeTruthy(); // loving emoji
    });

    it('should not show partner mood if user has not checked in yet', () => {
      mockUseDailyCheckin.mockReturnValue({
        myCheckin: null,
        partnerCheckin: {
          id: 'checkin2',
          userId: 'partner123',
          coupleId: 'couple123',
          mood: 'loving',
          gratitude: 'Partner gratitude',
          date: '2026-02-07',
          createdAt: { seconds: 123, nanoseconds: 0 },
        },
        loading: false,
        error: null,
        refresh: jest.fn(),
      });

      const { queryByText, getByText } = render(<DailyCheckinScreen />);

      // Should still show mood selection
      expect(getByText('How are you feeling today?')).toBeTruthy();

      // Should not show partner's gratitude
      expect(queryByText('Partner gratitude')).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when loading check-ins', () => {
      mockUseDailyCheckin.mockReturnValue({
        myCheckin: null,
        partnerCheckin: null,
        loading: true,
        error: null,
        refresh: jest.fn(),
      });

      const { getByTestId } = render(<DailyCheckinScreen />);

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });
});
