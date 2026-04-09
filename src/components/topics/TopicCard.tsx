'use client';

import Link from 'next/link';
import { CountdownTimer } from './CountdownTimer';
import { FlagButton } from '@/components/flags/FlagButton';
import { AiBadge } from '@/components/ui/AiBadge';
import type { Topic } from '@/types/database';

interface TopicCardProps {
  topic: Topic & { unique_writers?: number; total_reactions?: number; created_by_username?: string | null; created_by_is_ai?: boolean; flag_count?: number };
  isOpen: boolean;
}

function formatClosedDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function TopicCard({ topic, isOpen }: TopicCardProps) {
  return (
    <Link
      href={`/topics/${topic.id}`}
      className="block rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium line-clamp-2">{topic.body}</p>
          {!isOpen && topic.created_by_username && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
              <span>by {topic.created_by_username}</span>
              {topic.created_by_is_ai && <AiBadge />}
            </div>
          )}
          <div className={`${!isOpen && topic.created_by_username ? 'mt-1' : 'mt-2'} flex items-center gap-3 text-sm text-gray-500`}>
            {!isOpen && (topic as { unique_writers?: number }).unique_writers ? (
              <span>{(topic as { unique_writers?: number }).unique_writers} writers</span>
            ) : null}
            <span>{topic.submission_count} pitches</span>
            {(topic.flag_count ?? 0) > 0 && (
              <span className="text-red-500 font-medium">{topic.flag_count} {topic.flag_count === 1 ? 'flag' : 'flags'}</span>
            )}
            {!isOpen && (topic as { total_reactions?: number }).total_reactions ? (
              <span>{(topic as { total_reactions?: number }).total_reactions} reactions</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {isOpen ? (
            <div className="flex flex-col items-end gap-1">
              <CountdownTimer closesAt={topic.closes_at} />
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <div onClick={(e) => e.preventDefault()} onKeyDown={(e) => e.stopPropagation()}>
                <FlagButton type="prompt" targetId={topic.id} />
              </div>
            </div>
          ) : (
            <>
              <span className="text-sm text-gray-400">Closed</span>
              <p className="text-xs text-gray-400 mt-0.5">{formatClosedDate(topic.closes_at)}</p>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
