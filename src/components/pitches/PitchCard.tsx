'use client';

import { useState } from 'react';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import { ReactionCounts } from '@/components/reactions/ReactionCounts';
import { RankBadge } from '@/components/pitches/RankBadge';
import type { ReactionType } from '@/types/enums';

export interface PitchData {
  id: string;
  prompt_id: string;
  body: string;
  user_id: string | null;
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
  edit_deadline: string | null;
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
            {!isOpen && pitch.is_revealed && pitch.user_id && !pitch.is_own && (
              <span className="text-gray-500">by {pitch.user_id}</span>
            )}
          </div>
        </div>

        {pitch.is_own && isOpen && (
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ...
            </button>
            {showActions && (
              <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                {canEdit && (
                  <button
                    onClick={() => { onEdit?.(pitch.id, pitch.body); setShowActions(false); }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => { onDelete?.(pitch.id); setShowActions(false); }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-3">
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
    </div>
  );
}
