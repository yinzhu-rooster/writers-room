'use client';

import { useEffect, useState, useCallback } from 'react';
import { PitchCard, type PitchData } from './PitchCard';
import { PitchEditModal } from './PitchEditModal';
import { Pagination } from '@/components/ui/Pagination';

interface PitchListProps {
  promptId: string;
  isOpen: boolean;
  refreshKey: number;
}

export function PitchList({ promptId, isOpen, refreshKey }: PitchListProps) {
  const [pitches, setPitches] = useState<PitchData[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingPitch, setEditingPitch] = useState<{ id: string; body: string } | null>(null);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const loadPitches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/prompts/${promptId}/pitches?page=${page}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setPitches(data.pitches ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('Failed to load pitches:', err);
    }
    setLoading(false);
  }, [promptId, page]);

  useEffect(() => { loadPitches(); }, [loadPitches, refreshKey]);

  const handleDelete = async (pitchId: string) => {
    if (!window.confirm('Delete this pitch? This cannot be undone.')) return;
    const res = await fetch(`/api/pitches/${pitchId}`, { method: 'DELETE' });
    if (res.ok) loadPitches();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (pitches.length === 0) {
    return <p className="text-center text-gray-500 py-8">No pitches yet. Be the first!</p>;
  }

  return (
    <>
      <div className="space-y-3">
        {pitches.map((pitch) => (
          <PitchCard
            key={pitch.id}
            pitch={pitch}
            isOpen={isOpen}
            onReactionChange={loadPitches}
            onEdit={(id, body) => setEditingPitch({ id, body })}
            onDelete={handleDelete}
          />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      {editingPitch && (
        <PitchEditModal
          pitchId={editingPitch.id}
          initialBody={editingPitch.body}
          onClose={() => setEditingPitch(null)}
          onSaved={loadPitches}
        />
      )}
    </>
  );
}
