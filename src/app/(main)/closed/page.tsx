'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { TopicCard } from '@/components/topics/TopicCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Topic } from '@/types/database';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_pitches', label: 'Most Pitches' },
  { value: 'most_reactions', label: 'Most Reactions' },
] as const;

type SortValue = typeof SORT_OPTIONS[number]['value'];

export default function ClosedTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortValue>('newest');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (pageNum: number, sortBy: SortValue, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/topics?status=closed&sort=${sortBy}&page=${pageNum}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const newTopics = data.topics ?? [];
      const total = data.total ?? 0;
      if (append) {
        setTopics(prev => [...prev, ...newTopics]);
      } else {
        setTopics(newTopics);
      }
      setHasMore(pageNum * (data.page_size ?? 100) < total);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    if (append) setLoadingMore(false); else setLoading(false);
  }, []);

  // Reset when sort changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadPage(1, sort, false);
    return () => abortRef.current?.abort();
  }, [loadPage, sort]);

  // Load more pages
  useEffect(() => {
    if (page > 1) loadPage(page, sort, true);
  }, [page, sort, loadPage]);

  const sentinelRef = useInfiniteScroll(
    () => setPage(p => p + 1),
    hasMore && !loadingMore && !loading,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Closed Topics</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
          aria-label="Sort by"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="text-center text-red-600 py-12">{error}</p>
      ) : loading ? (
        <LoadingSkeleton count={3} height="h-24" />
      ) : topics.length === 0 ? (
        <EmptyState message="No closed topics yet" />
      ) : (
        <div className="space-y-3">
          {topics.map((p) => (
            <TopicCard key={p.id} topic={p} isOpen={false} />
          ))}
        </div>
      )}

      {hasMore && topics.length > 0 && (
        <div ref={sentinelRef} className="py-4">
          {loadingMore && <LoadingSkeleton count={2} height="h-24" />}
        </div>
      )}
    </div>
  );
}
