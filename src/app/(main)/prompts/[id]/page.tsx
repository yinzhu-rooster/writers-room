'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CountdownTimer } from '@/components/prompts/CountdownTimer';
import { PitchList } from '@/components/pitches/PitchList';
import { PitchInput } from '@/components/pitches/PitchInput';
import { useUser } from '@/hooks/useUser';
import type { Prompt } from '@/types/database';

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authUser } = useUser();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPrompt = useCallback(async () => {
    const res = await fetch(`/api/prompts/${id}`);
    if (res.ok) {
      setPrompt(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadPrompt(); }, [loadPrompt]);

  // Poll prompt status every 30s for live transition
  useEffect(() => {
    const interval = setInterval(loadPrompt, 30000);
    return () => clearInterval(interval);
  }, [loadPrompt]);

  if (loading) return <div className="h-32 rounded-xl bg-gray-100 animate-pulse" />;
  if (!prompt) return <p className="text-center text-gray-500 py-12">Prompt not found</p>;

  const isOpen = new Date(prompt.closes_at) > new Date();

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          {isOpen ? (
            <CountdownTimer closesAt={prompt.closes_at} onExpired={loadPrompt} />
          ) : (
            <span className="text-sm text-gray-400">Closed</span>
          )}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{prompt.body}</h1>
        <p className="text-sm text-gray-500 mt-1">{prompt.submission_count} pitches</p>
      </div>

      {isOpen && authUser && (
        <PitchInput
          promptId={prompt.id}
          onSubmitted={() => setRefreshKey((k) => k + 1)}
        />
      )}

      <PitchList promptId={prompt.id} isOpen={isOpen} refreshKey={refreshKey} />
    </div>
  );
}
