'use client';

import Link from 'next/link';
import { CountdownTimer } from './CountdownTimer';
import type { Prompt } from '@/types/database';

interface PromptCardProps {
  prompt: Prompt;
  isOpen: boolean;
}

export function PromptCard({ prompt, isOpen }: PromptCardProps) {
  const typeLabel = prompt.prompt_type.charAt(0).toUpperCase() + prompt.prompt_type.slice(1);

  return (
    <Link
      href={`/prompts/${prompt.id}`}
      className="block rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {typeLabel}
            </span>
            {prompt.is_system_generated && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                System
              </span>
            )}
          </div>
          <p className="text-gray-900 font-medium line-clamp-2">{prompt.body}</p>
          <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
            <span>{prompt.submission_count} pitches</span>
          </div>
        </div>
        <div className="shrink-0">
          {isOpen ? (
            <CountdownTimer closesAt={prompt.closes_at} />
          ) : (
            <span className="text-sm text-gray-400">Closed</span>
          )}
        </div>
      </div>
    </Link>
  );
}
