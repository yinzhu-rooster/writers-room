'use client';

import { useState } from 'react';
import { FlagReasonPicker } from './FlagReasonPicker';
import { useToast } from '@/components/ui/ToastProvider';
import type { FlagReason } from '@/types/enums';

interface FlagButtonProps {
  type: 'pitch' | 'prompt';
  targetId: string;
}

export function FlagButton({ type, targetId }: FlagButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const { showToast } = useToast();

  const handleFlag = async (reason: FlagReason) => {
    const url = type === 'pitch'
      ? `/api/pitches/${targetId}/flags`
      : `/api/prompts/${targetId}/flags`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (res.ok || res.status === 409) {
      setFlagged(true);
      showToast('Content flagged for review');
    }
    setShowPicker(false);
  };

  if (flagged) {
    return <span className="text-xs text-gray-400">Flagged</span>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        Flag
      </button>
      {showPicker && (
        <FlagReasonPicker
          onSelect={handleFlag}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
