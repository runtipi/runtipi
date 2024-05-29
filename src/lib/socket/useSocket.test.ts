import { MockedFunction, afterEach, describe, expect, it, vi } from 'vitest';
import { useSocket } from './useSocket'; // Adjust the path as needed
import io, { Socket } from 'socket.io-client';
import { renderHook, waitFor } from '@/tests/test-utils';

// Mocking socket.io-client
vi.mock('socket.io-client');
const mockedIo = io as unknown as MockedFunction<typeof io>;

// Utility functions to mock the socket.io behavior
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
  disconnected: false,
};

mockedIo.mockReturnValue(mockSocket as unknown as Socket);

describe('useSocket', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to the socket on mount', () => {
    const props = {
      selector: { type: 'runtipi-logs' },
    } as const;

    renderHook(() => useSocket(props));

    expect(mockedIo).toHaveBeenCalled();
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
  });

  it('should emit on connect if emitOnConnect is provided', () => {
    const emitOnConnect = { type: 'runtipi-logs', event: 'viewLogs', data: {} } as const;
    renderHook(() => useSocket({ selector: { type: 'runtipi-logs' }, emitOnConnect }));

    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    mockSocket.on.mock.calls.find((call) => call[0] === 'connect')[1](); // Call the connect handler

    expect(mockSocket.emit).toHaveBeenCalledWith(emitOnConnect.type, emitOnConnect);
  });

  it('should handle events according to the selector', () => {
    const eventData = { type: 'app-logs', event: 'newLogs', data: { appId: 'test' } };
    const onEvent = vi.fn();

    renderHook(() => useSocket({ selector: { type: 'app-logs', event: 'newLogs' }, onEvent }));

    expect(mockSocket.on).toHaveBeenCalledWith('app-logs', expect.any(Function));

    mockSocket.on.mock.calls.find((call) => call[0] === 'app-logs')[1](eventData); // Call the event handler

    expect(onEvent).toHaveBeenCalledWith('newLogs', eventData.data);
  });

  it('should handle errors', () => {
    const onError = vi.fn();
    const errorMessage = 'test error';

    renderHook(() =>
      useSocket({
        selector: { type: 'runtipi-logs' },
        onError,
      }),
    );

    expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    mockSocket.on.mock.calls.find((call) => call[0] === 'error')[1](errorMessage); // Call the error handler

    expect(onError).toHaveBeenCalledWith(errorMessage);
  });

  it('should emit on disconnect if emitOnDisconnect is provided', () => {
    const { unmount } = renderHook(() =>
      useSocket({ selector: { type: 'app' }, emitOnDisconnect: { type: 'app', event: 'stop_error', data: { appId: 'test' } } }),
    );

    unmount();

    expect(mockSocket.emit).toHaveBeenCalledWith('app', { type: 'app', event: 'stop_error', data: { appId: 'test' } });
    expect(mockSocket.off).toHaveBeenCalledWith('app');
    expect(mockSocket.off).toHaveBeenCalledWith('error');
  });

  it('should call onCleanup on unmount', () => {
    const onCleanup = vi.fn();

    const { unmount } = renderHook(() => useSocket({ selector: { type: 'app-logs' }, onCleanup }));

    unmount();

    expect(onCleanup).toHaveBeenCalled();
  });

  it('should update lastData state on receiving data matching selector', async () => {
    const eventData = { type: 'app', event: 'stop_success', data: { appId: 'value' } };

    const { result } = renderHook(() => useSocket({ selector: { type: 'app' } }));

    expect(mockSocket.on).toHaveBeenCalledWith('app', expect.any(Function));
    mockSocket.on.mock.calls.find((call) => call[0] === 'app')[1](eventData); // Call the event handler

    await waitFor(() => {
      expect(result.current.lastData).toEqual(eventData.data);
    });
  });
});
