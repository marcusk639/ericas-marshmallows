import { renderHook, act } from '@testing-library/react-hooks';
import { useQuickPicks } from '../useQuickPicks';
import * as quickPicksService from '../../services/quickPicks';
import type { WithId, QuickPick } from '../../../../shared/types';

// Mock the quickPicks service
jest.mock('../../services/quickPicks');

describe('useQuickPicks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load quick picks on mount', async () => {
    const mockQuickPicks: WithId<QuickPick>[] = [
      {
        id: 'pick1',
        message: 'I love you',
        emoji: '❤️',
        category: 'loving',
      },
      {
        id: 'pick2',
        message: 'Miss you',
        emoji: '🥺',
        category: 'sweet',
      },
    ];

    jest.spyOn(quickPicksService, 'getQuickPicks').mockResolvedValue(mockQuickPicks);

    const { result } = renderHook(() => useQuickPicks());

    expect(result.current.loading).toBe(true);
    expect(result.current.quickPicks).toEqual([]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.quickPicks).toEqual(mockQuickPicks);
    expect(result.current.error).toBeNull();
  });

  it('should handle when no quick picks exist', async () => {
    jest.spyOn(quickPicksService, 'getQuickPicks').mockResolvedValue([]);

    const { result } = renderHook(() => useQuickPicks());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.quickPicks).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors when loading quick picks', async () => {
    const error = new Error('Failed to load quick picks');
    jest.spyOn(quickPicksService, 'getQuickPicks').mockRejectedValue(error);

    const { result } = renderHook(() => useQuickPicks());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.quickPicks).toEqual([]);
    expect(result.current.error).toEqual(error);
  });

  it('should refresh quick picks when refresh is called', async () => {
    const mockQuickPicks1: WithId<QuickPick>[] = [
      {
        id: 'pick1',
        message: 'I love you',
        emoji: '❤️',
        category: 'loving',
      },
    ];

    const mockQuickPicks2: WithId<QuickPick>[] = [
      ...mockQuickPicks1,
      {
        id: 'pick2',
        message: 'Miss you',
        emoji: '🥺',
        category: 'sweet',
      },
    ];

    jest
      .spyOn(quickPicksService, 'getQuickPicks')
      .mockResolvedValueOnce(mockQuickPicks1)
      .mockResolvedValueOnce(mockQuickPicks2);

    const { result } = renderHook(() => useQuickPicks());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.quickPicks).toEqual(mockQuickPicks1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.quickPicks).toEqual(mockQuickPicks2);
  });

  it('should clear error on successful refresh', async () => {
    const error = new Error('Failed');

    jest
      .spyOn(quickPicksService, 'getQuickPicks')
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce([
        {
          id: 'pick1',
          message: 'I love you',
          emoji: '❤️',
          category: 'loving' as const,
        },
      ]);

    const { result } = renderHook(() => useQuickPicks());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toEqual(error);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
  });
});
