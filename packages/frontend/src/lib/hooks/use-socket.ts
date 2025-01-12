import { type SocketEvent, socketEventSchema } from 'backend';
import { useEffect, useRef, useState } from 'react';
import io, { type Socket } from 'socket.io-client';

// Data selector is used to select a specific property/value from the data object if it exists
type DataSelector<T> = {
  property: keyof Extract<SocketEvent, { type: T }>['data'];
  value: unknown;
};

type Selector<T, U> = {
  type: T;
  event?: U;
  data?: DataSelector<T>;
};

type Props<T, U> = {
  onEvent?: (event: Extract<Extract<SocketEvent, { type: T }>['event'], U>, data: Extract<SocketEvent, { type: T }>['data']) => void;
  onError?: (error: string) => void;
  onCleanup?: () => void;
  emitOnConnect?: SocketEvent;
  emitOnDisconnect?: SocketEvent;
  initialData?: Extract<SocketEvent, { type: T }>['data'] | undefined;
  selector: Selector<T, U>;
};

export const useSocket = <T extends SocketEvent['type'], U extends SocketEvent['event']>(props: Props<T, U>) => {
  const { onEvent, onError, onCleanup, selector, initialData, emitOnConnect, emitOnDisconnect } = props;
  const [lastData, setLastData] = useState(initialData as unknown);
  const socketRef = useRef<Socket | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: This effect should never re-run
  useEffect(() => {
    const { hostname, port, protocol } = window.location;

    if (!socketRef.current) {
      socketRef.current = io(`${protocol}//${hostname}:${port}`, { path: '/api/socket.io' });
    }

    if (socketRef.current?.disconnected) {
      socketRef.current.connect();
    }

    socketRef.current.on('connect', () => {
      if (emitOnConnect) {
        socketRef.current?.emit(emitOnConnect.type, emitOnConnect);
      }
    });

    const handleEvent = (type: SocketEvent['type'], rawData: unknown) => {
      const parsedEvent = socketEventSchema.safeParse(rawData);

      if (!parsedEvent.success) {
        return;
      }

      const { event, data } = parsedEvent.data;

      if (selector) {
        if (selector.type !== type) {
          return;
        }

        if (selector.event && selector.event !== event) {
          return;
        }

        const property = selector.data?.property as keyof SocketEvent['data'];
        if (selector.data && data && selector.data.value !== data[property]) {
          return;
        }
      }

      setLastData(data);
      // @ts-ignore - This is fine
      if (onEvent) onEvent(event, data);
    };

    socketRef.current?.on(selector.type as string, (data) => {
      handleEvent(selector.type, data);
    });

    socketRef.current?.on('error', (error: string) => {
      onError?.(String(error));
    });

    return () => {
      if (emitOnDisconnect) {
        socketRef.current?.emit(emitOnDisconnect.type, emitOnDisconnect);
      }

      socketRef.current?.off(selector.type as string);
      socketRef.current?.off('error');
      socketRef.current = undefined;
      onCleanup?.();
    };
  }, []);

  return { lastData, socket: socketRef.current } as { lastData: Extract<SocketEvent, { type: T }>['data'] | undefined; socket: Socket | undefined };
};
