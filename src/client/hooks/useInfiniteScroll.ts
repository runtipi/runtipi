import { useRef, useEffect, useCallback } from 'react';

type Props = {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetching: boolean;
};

export const useInfiniteScroll = ({ fetchNextPage, hasNextPage, isFetching }: Props) => {
  const observer = useRef<IntersectionObserver>();
  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (isFetching) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage();
        }
      });

      if (node) observer.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetching],
  );

  useEffect(() => {
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, []);

  return { lastElementRef };
};
