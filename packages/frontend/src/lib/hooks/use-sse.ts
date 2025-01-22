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
