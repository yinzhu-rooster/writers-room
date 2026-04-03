'use client';

import type { FlagReason } from '@/types/enums';

const REASONS: { value: FlagReason; label: string }[] = [
  { value: 'offensive', label: 'Offensive' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'plagiarized', label: 'Plagiarized' },
];

interface FlagReasonPickerProps {
  onSelect: (reason: FlagReason) => void;
  onClose: () => void;
}

export function FlagReasonPicker({ onSelect, onClose }: FlagReasonPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div role="menu" aria-label="Flag reason" className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
        {REASONS.map((r) => (
          <button
            key={r.value}
            role="menuitem"
            onClick={() => onSelect(r.value)}
            className="block w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
          >
            {r.label}
          </button>
        ))}
      </div>
    </>
  );
}
