'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pagination } from '@/components/ui/Pagination';

type SortMode = 'total_laughs' | 'avg_laughs' | 'total_reps' | 'top3_pct';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'total_laughs', label: 'Total Laughs' },
  { value: 'avg_laughs', label: 'Avg Laughs' },
  { value: 'total_reps', label: 'Most Reps' },
  { value: 'top3_pct', label: 'Top 3%' },
];

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url: string | null;
  total_laughs: number;
  total_reps: number;
  avg_laughs?: number;
  top3_pct?: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [sort, setSort] = useState<SortMode>('total_laughs');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leaderboard?sort=${sort}&page=${page}`);
    const data = await res.json();
    setEntries(data.leaderboard ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [sort, page]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  const getValue = (entry: LeaderboardEntry) => {
    switch (sort) {
      case 'total_laughs': return entry.total_laughs;
      case 'avg_laughs': return entry.avg_laughs?.toFixed(1) ?? '0';
      case 'total_reps': return entry.total_reps;
      case 'top3_pct': return `${entry.top3_pct}%`;
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Leaderboard</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setSort(opt.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
              sort === opt.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No data yet</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3"
            >
              <span className="text-sm font-bold text-gray-400 w-8">
                {(page - 1) * pageSize + i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {entry.username ?? 'Anonymous'}
                </span>
              </div>
              <span className="text-sm font-bold text-indigo-600">
                {getValue(entry)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
