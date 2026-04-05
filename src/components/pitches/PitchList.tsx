'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PitchCard, type PitchData } from './PitchCard';
import { PitchEditModal } from './PitchEditModal';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/ToastProvider';

interface PitchListProps {
  promptId: string;
  isOpen: boolean;
  refreshKey: number;
}

export function PitchList({ promptId, isOpen, refreshKey }: PitchListProps) {
  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingPitch, setEditingPitch] = useState<{ id: string; body: string } | null>(null);
  const { showToast } = useToast();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fetch(`/api/prompts/${promptId}/pitches?page=${pageNum}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      const newPitches = data.pitches ?? [];
      const total = data.total ?? 0;
      if (append) {
        setPitches(prev => [...prev, ...newPitches]);
      } else {
        setPitches(newPitches);
      }
      setHasMore(pageNum * (data.page_size ?? 100) < total);
    } catch (err) {
      console.error('Failed to load pitches:', err);
    }
    setLoading(false);
    setLoadingMore(false);
  }, [promptId]);

  // Reset on refreshKey change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadPage(1, false);
  }, [loadPage, refreshKey]);

  // Load more when page increments
  useEffect(() => {
    if (page > 1) loadPage(page, true);
  }, [page, loadPage]);

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

  const handleDelete = async (pitchId: string) => {
    if (!window.confirm('Delete this pitch? This cannot be undone.')) return;
    const res = await fetch(`/api/pitches/${pitchId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Pitch deleted');
      setPage(1);
      setHasMore(true);
      loadPage(1, false);
    }
  };

  if (loading) {
    return <LoadingSkeleton count={3} />;
  }

  if (pitches.length === 0) {
    return <EmptyState message="No pitches yet. Be the first!" />;
  }

  return (
    <>
      <div className="space-y-3">
        {pitches.map((pitch) => (
          <PitchCard
            key={pitch.id}
            pitch={pitch}
            isOpen={isOpen}
            onReactionChange={isOpen ? undefined : () => loadPage(1, false)}
            onEdit={(id, body) => setEditingPitch({ id, body })}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {hasMore && pitches.length > 0 && (
        <div ref={sentinelRef} className="py-4">
          {loadingMore && <LoadingSkeleton count={2} />}
        </div>
      )}

      {editingPitch && (
        <PitchEditModal
          pitchId={editingPitch.id}
          initialBody={editingPitch.body}
          onClose={() => setEditingPitch(null)}
          onSaved={() => { setPage(1); setHasMore(true); loadPage(1, false); }}
        />
      )}
    </>
  );
}
