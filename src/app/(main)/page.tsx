'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { TopicCard } from '@/components/topics/TopicCard';
import { CreateTopicModal } from '@/components/topics/CreateTopicModal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Topic } from '@/types/database';

export default function OpenTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/topics?status=open&page=${pageNum}`, { signal: controller.signal });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load');
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

  useEffect(() => {
    loadPage(1, false);
    return () => abortRef.current?.abort();
  }, [loadPage]);

  useEffect(() => {
    if (page > 1) loadPage(page, true);
  }, [page, loadPage]);

  const sentinelRef = useInfiniteScroll(
    () => setPage(p => p + 1),
    hasMore && !loadingMore && !loading,
  );

  const handleCreated = () => {
    setPage(1);
    setHasMore(true);
    loadPage(1, false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Open Topics</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          New Topic
        </button>
      </div>

      {error ? (
        <p className="text-center text-red-600 py-12">{error}</p>
      ) : loading ? (
        <LoadingSkeleton count={3} height="h-24" />
      ) : topics.length === 0 ? (
        <EmptyState message="No open topics right now" action={{ label: 'Create one', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="space-y-3">
          {topics.map((p) => (
            <TopicCard key={p.id} topic={p} isOpen={true} />
          ))}
        </div>
      )}

      {hasMore && topics.length > 0 && (
        <div ref={sentinelRef} className="py-4">
          {loadingMore && <LoadingSkeleton count={2} height="h-24" />}
        </div>
      )}

      <CreateTopicModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
