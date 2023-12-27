import { SocketEvent, socketEventSchema } from '@runtipi/shared/src/schemas/socket';
import { useEffect } from 'react';
import io from 'socket.io-client';

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
  onEvent: (event: Extract<Extract<SocketEvent, { type: T }>['event'], U>, data: Extract<SocketEvent, { type: T }>['data']) => void;
  onError?: (error: string) => void;
  selector: Selector<T, U>;
};

export const useSocket = <T extends SocketEvent['type'], U extends SocketEvent['event']>(props: Props<T, U>) => {
  const { onEvent, onError, selector } = props;

  useEffect(() => {
    const { hostname, protocol } = window.location;
    const socket = io(`${protocol}//${hostname}`, { path: '/worker/socket.io' });

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
        if (selector.data && selector.data.value !== data[property]) {
          return;
        }
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - This is fine
      onEvent(event, data);
    };

    socket.on(selector.type as string, (data) => {
      handleEvent(selector.type, data);
    });

    socket.on('error', (error: string) => {
      onError?.(String(error));
    });

    return () => {
      socket?.off(selector.type as string);
      socket.disconnect();
    };
  }, [onError, onEvent, selector, selector.type]);
};
