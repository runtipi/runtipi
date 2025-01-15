import type { SSE, Topic } from 'backend';
import { useEffect } from 'react';

type Props<T> = {
  topic: T;
  onEvent: (event: Extract<SSE, { topic: T }>['data']) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  params?: URLSearchParams;
};

export const useSSE = <T extends Topic>(props: Props<T>) => {
  const { topic, onEvent, onError, onOpen } = props;

  // biome-ignore lint/correctness/useExhaustiveDependencies: This hook should only run once on mount
  useEffect(() => {
    const url = new URL(`${window.location.origin}/api/sse/${topic}`);

    if (props.params) {
      url.search = props.params.toString();
    }
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      onEvent(JSON.parse(e.data));
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
    };

    return () => {
      console.info('SSE connection closed');
      eventSource.close();
    };
  }, []);
};
