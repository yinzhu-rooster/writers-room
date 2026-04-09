'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import { ReactionCounts } from '@/components/reactions/ReactionCounts';
import { RankBadge } from '@/components/pitches/RankBadge';
import { FlagButton } from '@/components/flags/FlagButton';
import { AiBadge } from '@/components/ui/AiBadge';
import type { ReactionType } from '@/types/enums';

export interface PitchData {
  id: string;
  prompt_id: string;
  body: string;
  user_id: string | null;
  username: string | null;
  created_at: string;
  edited_at: string | null;
  is_own: boolean;
  my_reaction: ReactionType | null;
  laugh_count: number | null;
  smile_count: number | null;
  surprise_count: number | null;
  total_reaction_count: number | null;
  rank: number | null;
  is_revealed: boolean;
  is_ai: boolean;
  edit_deadline: string | null;
  flag_count: number;
}

interface PitchCardProps {
  pitch: PitchData;
  isOpen: boolean;
  onReactionChange?: () => void;
  onEdit?: (id: string, body: string) => void;
  onDelete?: (id: string) => void;
}

export function PitchCard({ pitch, isOpen, onReactionChange, onEdit, onDelete }: PitchCardProps) {
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLButtonElement[]>([]);

  useEffect(() => {
    if (!showActions) return;
    const handleClick = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowActions(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    // Focus first menu item when opened
    requestAnimationFrame(() => {
      menuItemsRef.current[0]?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showActions]);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuItemsRef.current.filter(Boolean);
    if (items.length === 0) return;
    const idx = items.indexOf(e.target as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  }, []);

  const canEdit = isOpen && pitch.is_own && pitch.edit_deadline && new Date(pitch.edit_deadline) > new Date();
  const canDelete = isOpen && pitch.is_own;

  return (
    <div className={`rounded-lg border p-4 ${pitch.is_own ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {pitch.rank !== null && <RankBadge rank={pitch.rank} />}
          <p className="text-gray-900 whitespace-pre-wrap">{pitch.body}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            {pitch.is_own && <span className="text-indigo-600 font-medium">You</span>}
            {pitch.edited_at && <span>(edited)</span>}
            {pitch.flag_count > 0 && (
              <span className="text-red-500 font-medium">{pitch.flag_count} {pitch.flag_count === 1 ? 'flag' : 'flags'}</span>
            )}
            {!isOpen && pitch.is_revealed && pitch.username && !pitch.is_own && (
              <span className="text-gray-500 inline-flex items-center gap-1.5">by {pitch.username}{pitch.is_ai && <AiBadge />}</span>
            )}
          </div>
        </div>

        {pitch.is_own && isOpen && (
          <div className="relative" ref={actionsRef}>
            <button
              onClick={() => setShowActions(!showActions)}
              aria-label="Pitch actions"
              aria-expanded={showActions}
              aria-haspopup="true"
              className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ...
            </button>
            {showActions && (
              <div role="menu" className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10" onKeyDown={handleMenuKeyDown}>
                {canEdit && (
                  <button
                    ref={el => { if (el) menuItemsRef.current[0] = el; }}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => { onEdit?.(pitch.id, pitch.body); setShowActions(false); }}
                    className="block w-full text-left px-3 py-3 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    ref={el => { if (el) menuItemsRef.current[canEdit ? 1 : 0] = el; }}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => { onDelete?.(pitch.id); setShowActions(false); }}
                    className="block w-full text-left px-3 py-3 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          {isOpen ? (
            !pitch.is_own && (
              <ReactionBar
                pitchId={pitch.id}
                myReaction={pitch.my_reaction}
                onChange={onReactionChange}
              />
            )
          ) : (
            <ReactionCounts
              laugh={pitch.laugh_count ?? 0}
              smile={pitch.smile_count ?? 0}
              surprise={pitch.surprise_count ?? 0}
            />
          )}
        </div>
        {isOpen && !pitch.is_own && (
          <FlagButton type="pitch" targetId={pitch.id} />
        )}
      </div>
    </div>
  );
}
