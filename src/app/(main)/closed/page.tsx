'use client';

import { useEffect, useState, useCallback } from 'react';
import { PromptCard } from '@/components/prompts/PromptCard';
import { Pagination } from '@/components/ui/Pagination';
import type { Prompt } from '@/types/database';

export default function ClosedTopicsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const [error, setError] = useState('');

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/prompts?status=closed&page=${page}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setPrompts(data.prompts ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
    setLoading(false);
  }, [page]);

  useEffect(() => { loadPrompts(); }, [loadPrompts]);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Closed Topics</h1>

      {error ? (
        <p className="text-center text-red-600 py-12">{error}</p>
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No closed topics yet</p>
      ) : (
        <div className="space-y-3">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} isOpen={false} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
