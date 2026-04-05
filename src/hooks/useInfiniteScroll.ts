'use client';

import { useEffect, useRef } from 'react';

/**
 * Calls `onLoadMore` when a sentinel element scrolls into view.
 * Returns a ref to attach to the sentinel div.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  enabled: boolean,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && enabledRef.current) {
          callbackRef.current();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return sentinelRef;
}
