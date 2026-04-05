'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PromptCard } from '@/components/prompts/PromptCard';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Prompt } from '@/types/database';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'most_pitches', label: 'Most Pitches' },
  { value: 'most_reactions', label: 'Most Reactions' },
] as const;

type SortValue = typeof SORT_OPTIONS[number]['value'];

export default function ClosedTopicsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortValue>('newest');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortRef = useRef(sort);

  const loadPage = useCallback(async (pageNum: number, sortBy: SortValue, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prompts?status=closed&sort=${sortBy}&page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to load');
      if (sortRef.current !== sortBy) return;
      const data = await res.json();
      const newPrompts = data.prompts ?? [];
      const total = data.total ?? 0;
      if (append) {
        setPrompts(prev => [...prev, ...newPrompts]);
      } else {
        setPrompts(newPrompts);
      }
      setHasMore(pageNum * (data.page_size ?? 100) < total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    if (append) setLoadingMore(false); else setLoading(false);
  }, []);

  // Reset when sort changes
  useEffect(() => {
    sortRef.current = sort;
    setPage(1);
    setHasMore(true);
    loadPage(1, sort, false);
  }, [loadPage, sort]);

  // Load more pages
  useEffect(() => {
    if (page > 1) loadPage(page, sort, true);
  }, [page, sort, loadPage]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage(p => p + 1);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Closed Topics</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortValue)}
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
      ) : prompts.length === 0 ? (
        <EmptyState message="No closed topics yet" />
      ) : (
        <div className="space-y-3">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} isOpen={false} />
          ))}
        </div>
      )}

      {hasMore && prompts.length > 0 && (
        <div ref={sentinelRef} className="py-4">
          {loadingMore && <LoadingSkeleton count={2} height="h-24" />}
        </div>
      )}
    </div>
  );
}
