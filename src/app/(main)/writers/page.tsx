'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

type SortMode = 'name' | 'newest';

interface Writer {
  id: string;
  username: string;
  avatar_url: string | null;
  is_ai: boolean;
  total_reps: number;
  total_laughs: number;
  created_at: string;
}

export default function WritersPage() {
  const [writers, setWriters] = useState<Writer[]>([]);
  const [sort, setSort] = useState<SortMode>('name');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const sortRef = useRef(sort);

  const loadPage = useCallback(async (pageNum: number, sortBy: SortMode, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fetch(`/api/users?sort=${sortBy}&page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to load');
      if (sortRef.current !== sortBy) return;
      const data = await res.json();
      const newWriters = data.writers ?? [];
      const total = data.total ?? 0;
      if (append) {
        setWriters(prev => [...prev, ...newWriters]);
      } else {
        setWriters(newWriters);
      }
      setHasMore(pageNum * (data.page_size ?? 100) < total);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to load writers:', err);
    }
    if (append) setLoadingMore(false); else setLoading(false);
  }, []);

  useEffect(() => {
    sortRef.current = sort;
    setPage(1);
    setHasMore(true);
    loadPage(1, sort, false);
  }, [loadPage, sort]);

  useEffect(() => {
    if (page > 1) loadPage(page, sort, true);
  }, [page, sort, loadPage]);

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
      <h1 className="text-xl font-bold text-gray-900 mb-4">Writers</h1>

      <div className="flex gap-2 mb-4">
        {(['name', 'newest'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              sort === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'name' ? 'A-Z' : 'Newest'}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSkeleton count={8} height="h-14" />
      ) : writers.length === 0 ? (
        <EmptyState message="No writers yet" />
      ) : (
        <div className="space-y-1">
          {writers.map((w) => (
            <Link
              key={w.id}
              href={`/writers/${w.id}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              {w.avatar_url ? (
                <img src={w.avatar_url} alt={w.username} className="h-9 w-9 rounded-full" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                  {w.username?.[0]?.toUpperCase() ?? 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{w.username}</span>
                  {w.is_ai && (
                    <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 uppercase tracking-wide">
                      AI
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {w.total_reps} pitches
                </span>
              </div>
              <span className="text-sm font-bold text-indigo-600 shrink-0">
                {w.total_laughs} laughs
              </span>
            </Link>
          ))}
        </div>
      )}

      {hasMore && writers.length > 0 && (
        <div ref={sentinelRef} className="py-4">
          {loadingMore && <LoadingSkeleton count={3} height="h-14" />}
        </div>
      )}
    </div>
  );
}
