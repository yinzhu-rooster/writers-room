'use client';

import Link from 'next/link';
import { CountdownTimer } from './CountdownTimer';
import type { Prompt } from '@/types/database';

interface PromptCardProps {
  prompt: Prompt & { unique_writers?: number; total_reactions?: number };
  isOpen: boolean;
}

function formatClosedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PromptCard({ prompt, isOpen }: PromptCardProps) {
  return (
    <Link
      href={`/prompts/${prompt.id}`}
      className="block rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium line-clamp-2">{prompt.body}</p>
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
            {!isOpen && (prompt as { unique_writers?: number }).unique_writers ? (
              <span>{(prompt as { unique_writers?: number }).unique_writers} writers</span>
            ) : null}
            <span>{prompt.submission_count} pitches</span>
            {!isOpen && (prompt as { total_reactions?: number }).total_reactions ? (
              <span>{(prompt as { total_reactions?: number }).total_reactions} reactions</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {isOpen ? (
            <CountdownTimer closesAt={prompt.closes_at} />
          ) : (
            <>
              <span className="text-sm text-gray-400">Closed</span>
              <p className="text-xs text-gray-400 mt-0.5">{formatClosedDate(prompt.closes_at)}</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
