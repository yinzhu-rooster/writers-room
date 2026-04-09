'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { AiBadge } from '@/components/ui/AiBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';

type SortMode = 'name' | 'name_desc' | 'newest' | 'oldest';

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
  const [error, setError] = useState('');
  const sentinelRef = useInfiniteScroll(
    () => setPage(p => p + 1),
    hasMore && !loadingMore && !loading,
  );

  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (pageNum: number, sortBy: SortMode, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/users?sort=${sortBy}&page=${pageNum}`, { signal: controller.signal });
      if (!res.ok) throw new Error('Failed to load');
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
      setError('Failed to load writers');
    }
    if (append) setLoadingMore(false); else setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadPage(1, sort, false);
    return () => abortRef.current?.abort();
  }, [loadPage, sort]);

  useEffect(() => {
    if (page > 1) loadPage(page, sort, true);
  }, [page, sort, loadPage]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Writers</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort by"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 bg-white"
        >
          <option value="name">A-Z</option>
          <option value="name_desc">Z-A</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {error ? (
        <p className="text-center text-red-600 py-6">{error}</p>
      ) : loading ? (
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
              <UserAvatar username={w.username} avatarUrl={w.avatar_url} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{w.username}</span>
                  {w.is_ai && <AiBadge />}
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
