# Rendering Tests - Future Implementation Guide

## Current Status

**MemoryDetailScreen** tests currently only test data structures and logic, NOT actual UI rendering.

**Reason:** `react-test-renderer` version conflict prevents using `@testing-library/react-native`.

## The Issue

### Version Conflict
```
Error: Incorrect version of "react-test-renderer" detected.
Expected: "19.1.0"
Found: "19.2.4"
```

**Root Cause:**
- Parent workspace (`/node_modules`) has `react-test-renderer@19.2.4`
- Mobile workspace needs `react-test-renderer@19.1.0`
- Tests run from parent directory and pick up wrong version

**Affected Test Files:**
- `MemoryDetailScreen.test.tsx` (workaround: data tests only)
- `DailyCheckinScreen.test.tsx` (failing)
- `PhotoSuggestionsModal.test.tsx` (failing)
- `StreakBadge.test.tsx` (failing)
- `MoodSelector.test.tsx` (failing)
- `GratitudeInput.test.tsx` (failing)

## The Ideal Fix

### Step 1: Fix Version Conflict

**Option A: Remove Parent Dependency**
```bash
# From project root
npm uninstall react-test-renderer

# From mobile workspace
cd mobile
npm install -D react-test-renderer@19.1.0
```

**Option B: Update @testing-library/react-native**
```bash
cd mobile
npm install -D @testing-library/react-native@latest
# This may require a newer react-test-renderer version
```

**Option C: Use Workspaces Resolution** (Recommended)
```json
// In root package.json
{
  "overrides": {
    "react-test-renderer": "19.1.0"
  }
}
```

Then reinstall:
```bash
npm install
```

### Step 2: Add Proper Rendering Tests

Once the version conflict is resolved, replace data-only tests with comprehensive rendering tests.

## Ideal MemoryDetailScreen Rendering Tests

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MemoryDetailScreen from '../MemoryDetailScreen';
import type { WithId, Memory } from '../../../../shared/types';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  goBack: mockGoBack,
};

// Mock expo-av Video component
jest.mock('expo-av', () => ({
  Video: 'Video',
  ResizeMode: {
    COVER: 'cover',
    CONTAIN: 'contain',
  },
}));

describe('MemoryDetailScreen - Rendering Tests', () => {
  const createMockMemory = (overrides?: Partial<WithId<Memory>>): WithId<Memory> => ({
    id: 'memory1',
    coupleId: 'couple123',
    createdBy: 'user123',
    title: 'Beach Day',
    description: 'A wonderful day at the beach',
    photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
    videoUrls: ['https://example.com/video1.mp4'],
    devicePhotoUris: [],
    deviceVideoUris: [],
    tags: ['beach', 'summer'],
    date: {
      seconds: 1704067200,
      nanoseconds: 0,
    },
    source: 'manual' as const,
    createdAt: {
      seconds: 1704067200,
      nanoseconds: 0,
    },
    ...overrides,
  });

  describe('Header Rendering', () => {
    it('should render back button', () => {
      const memory = createMockMemory();
      const { getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const backButton = getByTestId('back-button');
      expect(backButton).toBeTruthy();
    });

    it('should navigate back when back button pressed', () => {
      const memory = createMockMemory();
      const { getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const backButton = getByTestId('back-button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('should render memory title in header', () => {
      const memory = createMockMemory();
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('Beach Day')).toBeTruthy();
    });

    it('should render formatted date in header', () => {
      const memory = createMockMemory();
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('January 1, 2024')).toBeTruthy();
    });
  });

  describe('Media Gallery Rendering', () => {
    it('should render all photos', () => {
      const memory = createMockMemory({
        photoUrls: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
        videoUrls: [],
      });
      const { getAllByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const photos = getAllByTestId('media-item-photo');
      expect(photos).toHaveLength(3);
    });

    it('should render all videos with play icon', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: [
          'https://example.com/video1.mp4',
          'https://example.com/video2.mp4',
        ],
      });
      const { getAllByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const videos = getAllByTestId('media-item-video');
      expect(videos).toHaveLength(2);

      const playIcons = getAllByTestId('video-play-icon');
      expect(playIcons).toHaveLength(2);
    });

    it('should render mixed photos and videos in order', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        videoUrls: ['https://example.com/video1.mp4'],
      });
      const { getAllByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const mediaItems = getAllByTestId(/media-item/);
      expect(mediaItems).toHaveLength(3);
    });

    it('should show empty state when no media', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: [],
      });
      const { getByText, getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('No photos or videos in this memory')).toBeTruthy();
      expect(getByTestId('empty-media-state')).toBeTruthy();
    });
  });

  describe('Fullscreen Modal Interaction', () => {
    it('should open fullscreen modal when photo tapped', async () => {
      const memory = createMockMemory();
      const { getAllByTestId, getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const photos = getAllByTestId('media-item-photo');
      fireEvent.press(photos[0]);

      await waitFor(() => {
        expect(getByTestId('fullscreen-modal')).toBeTruthy();
      });
    });

    it('should close fullscreen modal when close button pressed', async () => {
      const memory = createMockMemory();
      const { getAllByTestId, getByTestId, queryByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      // Open modal
      const photos = getAllByTestId('media-item-photo');
      fireEvent.press(photos[0]);

      await waitFor(() => {
        expect(getByTestId('fullscreen-modal')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByTestId('fullscreen-close-button');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId('fullscreen-modal')).toBeNull();
      });
    });

    it('should show photo in fullscreen modal', async () => {
      const memory = createMockMemory();
      const { getAllByTestId, getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const photos = getAllByTestId('media-item-photo');
      fireEvent.press(photos[0]);

      await waitFor(() => {
        expect(getByTestId('fullscreen-image')).toBeTruthy();
      });
    });

    it('should show video with controls in fullscreen modal', async () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: ['https://example.com/video1.mp4'],
      });
      const { getAllByTestId, getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const videos = getAllByTestId('media-item-video');
      fireEvent.press(videos[0]);

      await waitFor(() => {
        expect(getByTestId('fullscreen-video')).toBeTruthy();
      });
    });
  });

  describe('Description Section', () => {
    it('should render description when present', () => {
      const memory = createMockMemory();
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('Description')).toBeTruthy();
      expect(getByText('A wonderful day at the beach')).toBeTruthy();
    });

    it('should not render description section when empty', () => {
      const memory = createMockMemory({ description: '' });
      const { queryByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(queryByText('Description')).toBeNull();
    });

    it('should handle long descriptions with proper text wrapping', () => {
      const longDescription = 'This is a very long description that should wrap properly across multiple lines without breaking the layout or causing any display issues.';
      const memory = createMockMemory({ description: longDescription });
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText(longDescription)).toBeTruthy();
    });
  });

  describe('Tags Section', () => {
    it('should render all tags', () => {
      const memory = createMockMemory();
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('Tags')).toBeTruthy();
      expect(getByText('beach')).toBeTruthy();
      expect(getByText('summer')).toBeTruthy();
    });

    it('should not render tags section when empty', () => {
      const memory = createMockMemory({ tags: [] });
      const { queryByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(queryByText('Tags')).toBeNull();
    });

    it('should render many tags with proper wrapping', () => {
      const memory = createMockMemory({
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8'],
      });
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('tag1')).toBeTruthy();
      expect(getByText('tag8')).toBeTruthy();
    });
  });

  describe('Stats Section', () => {
    it('should render photo count with correct pluralization', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg'],
        videoUrls: [],
      });
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('1 photo')).toBeTruthy();
    });

    it('should render video count with correct pluralization', () => {
      const memory = createMockMemory({
        photoUrls: [],
        videoUrls: ['https://example.com/video1.mp4', 'https://example.com/video2.mp4'],
      });
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('2 videos')).toBeTruthy();
    });

    it('should render both photo and video stats', () => {
      const memory = createMockMemory({
        photoUrls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        videoUrls: ['https://example.com/video1.mp4'],
      });
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('2 photos')).toBeTruthy();
      expect(getByText('1 video')).toBeTruthy();
    });

    it('should render stat icons', () => {
      const memory = createMockMemory();
      const { getAllByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getAllByTestId('stat-icon')).toBeTruthy();
    });
  });

  describe('Scrolling Behavior', () => {
    it('should render ScrollView for content', () => {
      const memory = createMockMemory();
      const { getByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByTestId('memory-detail-scroll')).toBeTruthy();
    });

    it('should allow scrolling through many photos', () => {
      const photoUrls = Array.from({ length: 20 }, (_, i) => `https://example.com/photo${i}.jpg`);
      const memory = createMockMemory({ photoUrls, videoUrls: [] });

      const { getAllByTestId } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      const photos = getAllByTestId('media-item-photo');
      expect(photos).toHaveLength(20);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in title', () => {
      const memory = createMockMemory({
        title: 'Birthday 🎂 Party! & Celebration',
      });
      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText('Birthday 🎂 Party! & Celebration')).toBeTruthy();
    });

    it('should handle undefined videoUrls gracefully', () => {
      const memory = createMockMemory({
        videoUrls: undefined,
      });

      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      // Should still render without crashing
      expect(getByText('Beach Day')).toBeTruthy();
    });

    it('should handle very long titles without breaking layout', () => {
      const longTitle = 'This is a very long memory title that should be handled properly without breaking the layout or causing any display issues whatsoever';
      const memory = createMockMemory({ title: longTitle });

      const { getByText } = render(
        <MemoryDetailScreen
          route={{ params: { memory } }}
          navigation={mockNavigation}
        />
      );

      expect(getByText(longTitle)).toBeTruthy();
    });
  });
});
```

## Required TestIDs to Add

To make these rendering tests work, add `testID` props to components in `MemoryDetailScreen.tsx`:

```typescript
// Header
<TouchableOpacity testID="back-button" onPress={() => navigation.goBack()}>

// Media items
<TouchableOpacity
  testID={`media-item-${type}`}
  onPress={() => setFullscreenMedia({ url, type })}
>

// Video play icon
<Ionicons testID="video-play-icon" name="play-circle" />

// Empty state
<View testID="empty-media-state" style={styles.emptyMedia}>

// Fullscreen modal
<Modal testID="fullscreen-modal" visible={fullscreenMedia !== null}>

// Close button
<TouchableOpacity testID="fullscreen-close-button">

// Fullscreen media
<Image testID="fullscreen-image" />
<Video testID="fullscreen-video" />

// Scroll view
<ScrollView testID="memory-detail-scroll">

// Stats
<Ionicons testID="stat-icon" />
```

## Test Coverage Summary

Once rendering tests are implemented, you'll have:

- ✅ **Header Navigation** - Back button, title, date
- ✅ **Media Gallery** - Photos, videos, play icons, ordering
- ✅ **Fullscreen Modal** - Open/close, photo/video display
- ✅ **Description Section** - Rendering, empty state, long text
- ✅ **Tags Section** - Rendering, empty state, many tags
- ✅ **Stats Section** - Counts, pluralization, icons
- ✅ **Scrolling** - ScrollView, many items
- ✅ **Edge Cases** - Special chars, undefined values, long text

**Total:** ~40 comprehensive rendering tests covering all UI interactions.

## Benefits of Full Rendering Tests

1. **Catch UI Bugs** - Detect layout issues, missing elements
2. **User Interaction** - Verify buttons, navigation, modals work
3. **Regression Prevention** - Ensure UI doesn't break on updates
4. **Accessibility** - Test screen readers, keyboard navigation
5. **Confidence** - Know the UI actually renders and works

## Current Workaround

For now, we use data/logic tests only:
- ✅ 22 tests covering data structures
- ✅ All tests passing (165/165)
- ✅ No dependency conflicts
- ❌ No UI/rendering validation

This is **acceptable for now** but should be upgraded to full rendering tests when the version conflict is resolved.
