'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PromptCard } from '@/components/prompts/PromptCard';
import { CreatePromptModal } from '@/components/prompts/CreatePromptModal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Prompt } from '@/types/database';

export default function OpenTopicsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prompts?status=open&page=${pageNum}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to load');
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

  useEffect(() => { loadPage(1, false); }, [loadPage]);

  useEffect(() => {
    if (page > 1) loadPage(page, true);
  }, [page, loadPage]);

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
          New Prompt
        </button>
      </div>

      {error ? (
        <p className="text-center text-red-600 py-12">{error}</p>
      ) : loading ? (
        <LoadingSkeleton count={3} height="h-24" />
      ) : prompts.length === 0 ? (
        <EmptyState message="No open topics right now" action={{ label: 'Create one', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="space-y-3">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} isOpen={true} />
          ))}
        </div>
      )}

      {hasMore && prompts.length > 0 && (
        <div ref={sentinelRef} className="py-4">
          {loadingMore && <LoadingSkeleton count={2} height="h-24" />}
        </div>
      )}

      <CreatePromptModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
