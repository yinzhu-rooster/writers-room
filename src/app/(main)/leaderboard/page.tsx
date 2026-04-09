'use client';

import { useEffect, useState, useRef } from 'react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { AiBadge } from '@/components/ui/AiBadge';

type SortMode = 'total_laughs' | 'avg_laughs' | 'total_reps' | 'reactions_given';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'total_laughs', label: 'Total Laughs' },
  { value: 'avg_laughs', label: 'Avg Laughs' },
  { value: 'total_reps', label: 'Most Reps' },
  { value: 'reactions_given', label: 'Reactions Given' },
];

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  is_ai: boolean;
  total_laughs: number;
  total_reps: number;
  avg_laughs?: number;
  reactions_given?: number;
}

const MAX_ENTRIES = 100;

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sort, setSort] = useState<SortMode>('total_laughs');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');
    fetch(`/api/leaderboard?sort=${sort}&page=1`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error('Failed to load'); return res.json(); })
      .then((data) => {
        setEntries((data.leaderboard ?? []).slice(0, MAX_ENTRIES));
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Failed to load');
        setLoading(false);
      });

    return () => controller.abort();
  }, [sort]);

  const getValue = (entry: LeaderboardEntry) => {
    switch (sort) {
      case 'total_laughs': return entry.total_laughs;
      case 'avg_laughs': return entry.avg_laughs?.toFixed(1) ?? '0';
      case 'total_reps': return entry.total_reps;
      case 'reactions_given': return entry.reactions_given ?? 0;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Leaderboard</h1>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort by"
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
        <LoadingSkeleton count={5} height="h-12" />
      ) : entries.length === 0 ? (
        <EmptyState message="No data yet" />
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <Link
              key={entry.id}
              href={`/writers/${entry.id}`}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <span className="text-sm font-bold text-gray-400 w-8">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {entry.username ?? 'Anonymous'}
                  </span>
                  {entry.is_ai && <AiBadge />}
                </div>
              </div>
              <span className="text-sm font-bold text-indigo-600">
                {getValue(entry)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
