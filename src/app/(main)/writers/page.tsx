'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';

type SortMode = 'name' | 'newest';

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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const loadWriters = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/users?sort=${sort}&page=${page}`);
    if (res.ok) {
      const data = await res.json();
      setWriters(data.writers ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [sort, page]);

  useEffect(() => { loadWriters(); }, [loadWriters]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Writers</h1>

      <div className="flex gap-2 mb-4">
        {(['name', 'newest'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setSort(s); setPage(1); }}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              sort === s
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'name' ? 'A-Z' : 'Newest'}
          </button>
        ))}
      </div>

      {loading ? (
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
              {w.avatar_url ? (
                <img src={w.avatar_url} alt={w.username} className="h-9 w-9 rounded-full" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
                  {w.username[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{w.username}</span>
                  {w.is_ai && (
                    <span className="inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 uppercase tracking-wide">
                      AI
                    </span>
                  )}
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

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
