import type { SSE, Topic } from 'backend';
import { useEffect, useRef } from 'react';

type Props<T> = {
  topic: T;
  onEvent: (event: Extract<SSE, { topic: T }>['data']) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  params?: URLSearchParams;
};

export const useSSE = <T extends Topic>(props: Props<T>) => {
  const { topic, onEvent, onError, onOpen } = props;
  const eventSourceRef = useRef<EventSource | null>(null);

  const retries = useRef(0);

  const initializeSSE = () => {
    const url = new URL(`${window.location.origin}/api/sse/${topic}`);

    if (props.params) {
      url.search = props.params.toString();
    }

    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    eventSource.onopen = () => {
      retries.current = 0;
      console.info('SSE connection opened');
      if (onOpen) onOpen();
    };

    eventSource.onerror = (error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('SSE connection error:', error);
      }

      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff retry
      if (retries.current < 5) {
        retries.current++;
        setTimeout(
          () => {
            console.info('Retrying SSE connection after error');
            initializeSSE();
          },
          2 ** retries.current * 1000,
        );
      } else {
        console.error('Max retries reached, refresh the page to reconnect');
      }
    };

    eventSourceRef.current = eventSource;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: This hook should only run once on mount
  useEffect(() => {
    initializeSSE();

    const handleFocus = () => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        initializeSSE();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      console.info('Cleaning up SSE connection');
      window.removeEventListener('focus', handleFocus);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);
};
