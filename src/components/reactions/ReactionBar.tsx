'use client';

import { useState } from 'react';
import type { ReactionType } from '@/types/enums';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'smile', emoji: '\u{1F604}', label: 'Clever' },
  { type: 'laugh', emoji: '\u{1F602}', label: 'Funny' },
  { type: 'surprise', emoji: '\u{1F62E}', label: 'Surprising' },
];

interface ReactionBarProps {
  pitchId: string;
  myReaction: ReactionType | null;
  onChange?: () => void;
}

export function ReactionBar({ pitchId, myReaction, onChange }: ReactionBarProps) {
  const [current, setCurrent] = useState<ReactionType | null>(myReaction);
  const [loading, setLoading] = useState(false);

  const handleReact = async (type: ReactionType) => {
    setLoading(true);

    // Optimistic update — capture previous value before setting new
    const previous = current;
    const newReaction = current === type ? null : type;
    setCurrent(newReaction);

    const res = await fetch(`/api/pitches/${pitchId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction_type: type }),
    });

    if (!res.ok) {
      setCurrent(previous); // Revert to captured value
    }

    setLoading(false);
    onChange?.();
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Reactions">
      {REACTIONS.map((r) => (
        <button
          key={r.type}
          onClick={() => handleReact(r.type)}
          disabled={loading}
          aria-label={r.label}
          aria-pressed={current === r.type}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-lg transition-all ${
            current === r.type
              ? 'bg-indigo-100 scale-110'
              : 'bg-gray-50 hover:bg-gray-100'
          }`}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  );
}
