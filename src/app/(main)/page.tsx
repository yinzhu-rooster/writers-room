'use client';

import { useEffect, useState, useCallback } from 'react';
import { PromptCard } from '@/components/prompts/PromptCard';
import { CreatePromptModal } from '@/components/prompts/CreatePromptModal';
import { Pagination } from '@/components/ui/Pagination';
import type { Prompt } from '@/types/database';

export default function OpenTopicsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const loadPrompts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/prompts?status=open&page=${page}`);
    const data = await res.json();
    setPrompts(data.prompts ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { loadPrompts(); }, [loadPrompts]);

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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No open topics right now</p>
      ) : (
        <div className="space-y-3">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} isOpen={true} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <CreatePromptModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={loadPrompts}
      />
    </div>
  );
}
