'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

  // Sync local state when prop changes (e.g. after refetch)
  useEffect(() => {
    setCurrent(myReaction);
  }, [myReaction]);

  // Use ref for previous value to avoid stale closure issues
  const currentRef = useRef(current);
  currentRef.current = current;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const loadingRef = useRef(false);

  const handleReact = useCallback(async (type: ReactionType) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    // Capture previous via ref to avoid stale closure
    const previous = currentRef.current;
    const newReaction = previous === type ? null : type;
    setCurrent(newReaction);

    try {
      const res = await fetch(`/api/pitches/${pitchId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction_type: type }),
      });

      if (!res.ok) {
        setCurrent(previous); // Revert to captured value
      }
    } catch {
      setCurrent(previous); // Revert on network error
    } finally {
      loadingRef.current = false;
      setLoading(false);
      onChangeRef.current?.();
    }
  }, [pitchId]);

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
