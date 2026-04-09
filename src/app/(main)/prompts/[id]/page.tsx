'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CountdownTimer } from '@/components/prompts/CountdownTimer';
import { PitchList } from '@/components/pitches/PitchList';
import { PitchInput } from '@/components/pitches/PitchInput';
import { useUser } from '@/hooks/useUser';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Prompt } from '@/types/database';

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authUser } = useUser();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPrompt = useCallback(async () => {
    try {
      const res = await fetch(`/api/prompts/${id}`);
      if (res.ok) {
        setPrompt(await res.json());
      }
    } catch {
      console.error('Failed to load prompt');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadPrompt(); }, [loadPrompt]);

  // Poll prompt status every 30s for live transition
  useEffect(() => {
    const interval = setInterval(loadPrompt, 30000);
    return () => clearInterval(interval);
  }, [loadPrompt]);

  if (loading) return <LoadingSkeleton count={1} height="h-32" />;
  if (!prompt) return <EmptyState message="Topic not found" />;

  const isOpen = new Date(prompt.closes_at) > new Date();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-6rem)] md:h-[calc(100vh-3.5rem-1.5rem)]">
      {/* Sticky top: prompt title only */}
      <div className="shrink-0 border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          {isOpen ? (
            <CountdownTimer closesAt={prompt.closes_at} onExpired={loadPrompt} />
          ) : (
            <span className="text-sm text-gray-400">Closed</span>
          )}
          <span className="text-sm text-gray-400">{prompt.submission_count} pitches</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{prompt.body}</h1>
      </div>

      {/* Scrollable: input + pitch list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isOpen && authUser && (
          <PitchInput
            promptId={prompt.id}
            onSubmitted={() => setRefreshKey((k) => k + 1)}
          />
        )}
        <PitchList promptId={prompt.id} isOpen={isOpen} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
