'use client';

import { useCallback, useEffect, useRef } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus first item on mount
  useEffect(() => {
    itemsRef.current[0]?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = itemsRef.current.filter(Boolean) as HTMLButtonElement[];
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        role="menu"
        aria-label="Flag reason"
        className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
        onKeyDown={handleKeyDown}
      >
        {REASONS.map((r, i) => (
          <button
            key={r.value}
            ref={(el) => { itemsRef.current[i] = el; }}
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
