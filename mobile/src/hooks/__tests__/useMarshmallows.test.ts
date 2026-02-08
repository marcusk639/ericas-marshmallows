import { renderHook, act } from '@testing-library/react-hooks';
import { useMarshmallows, useSendMarshmallow } from '../useMarshmallows';
import * as marshmallowsService from '../../services/marshmallows';

// Mock the marshmallows service
jest.mock('../../services/marshmallows');

describe('useMarshmallows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const mockUnsubscribe = jest.fn();
    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockReturnValue(
      mockUnsubscribe
    );

    const { result } = renderHook(() => useMarshmallows('couple123'));

    expect(result.current.loading).toBe(true);
    expect(result.current.marshmallows).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should handle null coupleId', () => {
    const { result } = renderHook(() => useMarshmallows(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.marshmallows).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(marshmallowsService.subscribeToCoupleMarshmallows).not.toHaveBeenCalled();
  });

  it('should subscribe to marshmallows when coupleId is provided', () => {
    const mockUnsubscribe = jest.fn();
    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockReturnValue(
      mockUnsubscribe
    );

    renderHook(() => useMarshmallows('couple123'));

    expect(marshmallowsService.subscribeToCoupleMarshmallows).toHaveBeenCalledWith(
      'couple123',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should update marshmallows when subscription receives data', async () => {
    let subscriptionCallback: any;

    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockImplementation(
      (coupleId, callback) => {
        subscriptionCallback = callback;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useMarshmallows('couple123'));

    const mockMarshmallows = [
      {
        id: 'marshmallow1',
        coupleId: 'couple123',
        senderId: 'user1',
        recipientId: 'user2',
        message: 'Hello!',
        type: 'custom' as const,
        createdAt: { seconds: 1234567890, nanoseconds: 0 },
        read: false,
      },
    ];

    act(() => {
      subscriptionCallback(mockMarshmallows);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.marshmallows).toEqual(mockMarshmallows);
    expect(result.current.error).toBeNull();
  });

  it('should handle subscription errors', async () => {
    let subscriptionErrorCallback: any;

    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockImplementation(
      (coupleId, callback, onError) => {
        subscriptionErrorCallback = onError;
        return jest.fn();
      }
    );

    const { result } = renderHook(() => useMarshmallows('couple123'));

    const mockError = new Error('Subscription failed');

    act(() => {
      subscriptionErrorCallback(mockError);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should unsubscribe when component unmounts', () => {
    const mockUnsubscribe = jest.fn();
    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockReturnValue(
      mockUnsubscribe
    );

    const { unmount } = renderHook(() => useMarshmallows('couple123'));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should resubscribe when coupleId changes', () => {
    const mockUnsubscribe1 = jest.fn();
    const mockUnsubscribe2 = jest.fn();

    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock)
      .mockReturnValueOnce(mockUnsubscribe1)
      .mockReturnValueOnce(mockUnsubscribe2);

    const { rerender } = renderHook(
      (props: { coupleId: string }) => useMarshmallows(props.coupleId),
      {
        initialProps: { coupleId: 'couple123' },
      }
    );

    expect(marshmallowsService.subscribeToCoupleMarshmallows).toHaveBeenCalledTimes(1);

    rerender({ coupleId: 'couple456' });

    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(marshmallowsService.subscribeToCoupleMarshmallows).toHaveBeenCalledTimes(2);
    expect(marshmallowsService.subscribeToCoupleMarshmallows).toHaveBeenLastCalledWith(
      'couple456',
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('should mark marshmallow as read', async () => {
    const mockUnsubscribe = jest.fn();
    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockReturnValue(
      mockUnsubscribe
    );
    (marshmallowsService.markMarshmallowAsRead as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useMarshmallows('couple123'));

    await act(async () => {
      await result.current.markAsRead('marshmallow123');
    });

    expect(marshmallowsService.markMarshmallowAsRead).toHaveBeenCalledWith('marshmallow123');
  });

  it('should handle mark as read errors', async () => {
    const mockUnsubscribe = jest.fn();
    (marshmallowsService.subscribeToCoupleMarshmallows as jest.Mock).mockReturnValue(
      mockUnsubscribe
    );

    const mockError = new Error('Failed to mark as read');
    (marshmallowsService.markMarshmallowAsRead as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useMarshmallows('couple123'));

    await act(async () => {
      await result.current.markAsRead('marshmallow123');
    });

    expect(result.current.error).toEqual(mockError);
  });
});

describe('useSendMarshmallow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct state', () => {
    const { result } = renderHook(() => useSendMarshmallow('couple123', 'user1'));

    expect(result.current.sending).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.sendMarshmallow).toBe('function');
  });

  it('should send marshmallow successfully', async () => {
    (marshmallowsService.sendMarshmallow as jest.Mock).mockResolvedValue('marshmallow123');

    const { result } = renderHook(() => useSendMarshmallow('couple123', 'user1'));

    await act(async () => {
      await result.current.sendMarshmallow('user2', 'Hello!', 'custom');
    });

    expect(marshmallowsService.sendMarshmallow).toHaveBeenCalledWith(
      'couple123',
      'user1',
      'user2',
      'Hello!',
      'custom',
      undefined
    );
    expect(result.current.sending).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should send marshmallow with options', async () => {
    (marshmallowsService.sendMarshmallow as jest.Mock).mockResolvedValue('marshmallow123');

    const { result } = renderHook(() => useSendMarshmallow('couple123', 'user1'));

    await act(async () => {
      await result.current.sendMarshmallow('user2', 'Look!', 'photo', {
        photoUrl: 'https://storage.firebase.com/photo.jpg',
      });
    });

    expect(marshmallowsService.sendMarshmallow).toHaveBeenCalledWith(
      'couple123',
      'user1',
      'user2',
      'Look!',
      'photo',
      { photoUrl: 'https://storage.firebase.com/photo.jpg' }
    );
  });

  it('should set sending state while sending', async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (marshmallowsService.sendMarshmallow as jest.Mock).mockReturnValue(promise);

    const { result } = renderHook(() => useSendMarshmallow('couple123', 'user1'));

    let sendPromise: Promise<void>;

    act(() => {
      sendPromise = result.current.sendMarshmallow('user2', 'Hello!', 'custom');
    });

    expect(result.current.sending).toBe(true);

    await act(async () => {
      resolvePromise('marshmallow123');
      await sendPromise;
    });

    expect(result.current.sending).toBe(false);
  });

  it('should throw error when coupleId is null', async () => {
    const { result } = renderHook(() => useSendMarshmallow(null, 'user1'));

    await act(async () => {
      try {
        await result.current.sendMarshmallow('user2', 'Hello!', 'custom');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.error?.message).toBe('User must be signed in to send marshmallows');
  });

  it('should throw error when senderId is null', async () => {
    const { result } = renderHook(() => useSendMarshmallow('couple123', null));

    await act(async () => {
      try {
        await result.current.sendMarshmallow('user2', 'Hello!', 'custom');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.error?.message).toBe('User must be signed in to send marshmallows');
  });

  it('should handle send errors', async () => {
    const mockError = new Error('Failed to send');
    (marshmallowsService.sendMarshmallow as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useSendMarshmallow('couple123', 'user1'));

    await act(async () => {
      try {
        await result.current.sendMarshmallow('user2', 'Hello!', 'custom');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.sending).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('should clear error on successful send after previous error', async () => {
    (marshmallowsService.sendMarshmallow as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce('marshmallow123');

    const { result } = renderHook(() => useSendMarshmallow('couple123', 'user1'));

    // First send fails
    await act(async () => {
      try {
        await result.current.sendMarshmallow('user2', 'Hello!', 'custom');
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.error).not.toBeNull();

    // Second send succeeds
    await act(async () => {
      await result.current.sendMarshmallow('user2', 'Hello again!', 'custom');
    });

    expect(result.current.error).toBeNull();
  });

  it('should maintain stable callback reference', () => {
    const { result, rerender } = renderHook(
      (props: { coupleId: string; senderId: string }) =>
        useSendMarshmallow(props.coupleId, props.senderId),
      {
        initialProps: { coupleId: 'couple123', senderId: 'user1' },
      }
    );

    const firstCallback = result.current.sendMarshmallow;

    rerender({ coupleId: 'couple123', senderId: 'user1' });

    expect(result.current.sendMarshmallow).toBe(firstCallback);
  });

  it('should update callback when coupleId changes', () => {
    const { result, rerender } = renderHook(
      (props: { coupleId: string; senderId: string }) =>
        useSendMarshmallow(props.coupleId, props.senderId),
      {
        initialProps: { coupleId: 'couple123', senderId: 'user1' },
      }
    );

    const firstCallback = result.current.sendMarshmallow;

    rerender({ coupleId: 'couple456', senderId: 'user1' });

    expect(result.current.sendMarshmallow).not.toBe(firstCallback);
  });
});
