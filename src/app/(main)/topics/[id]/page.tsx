'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { CountdownTimer } from '@/components/topics/CountdownTimer';
import { PitchList } from '@/components/pitches/PitchList';
import { PitchInput } from '@/components/pitches/PitchInput';
import { useUser } from '@/hooks/useUser';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Topic } from '@/types/database';

export default function TopicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authUser } = useUser();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadTopic = useCallback(async () => {
    try {
      const res = await fetch(`/api/topics/${id}`);
      if (res.ok) {
        setTopic(await res.json());
      }
    } catch {
      console.error('Failed to load prompt');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadTopic(); }, [loadTopic]);

  // Poll prompt status every 30s for live transition
  useEffect(() => {
    const interval = setInterval(loadTopic, 30000);
    return () => clearInterval(interval);
  }, [loadTopic]);

  if (loading) return <LoadingSkeleton count={1} height="h-32" />;
  if (!topic) return <EmptyState message="Topic not found" />;

  const isOpen = new Date(topic.closes_at) > new Date();

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-6rem)] md:h-[calc(100vh-3.5rem-1.5rem)]">
      {/* Sticky top: prompt title only */}
      <div className="shrink-0 border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          {isOpen ? (
            <CountdownTimer closesAt={topic.closes_at} onExpired={loadTopic} />
          ) : (
            <span className="text-sm text-gray-400">Closed</span>
          )}
          <span className="text-sm text-gray-400">{topic.submission_count} pitches</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{topic.body}</h1>
      </div>

      {/* Scrollable: input + pitch list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isOpen && authUser && (
          <PitchInput
            topicId={topic.id}
            onSubmitted={() => setRefreshKey((k) => k + 1)}
          />
        )}
        <PitchList topicId={topic.id} isOpen={isOpen} refreshKey={refreshKey} />
      </div>
    </div>
  );
}
