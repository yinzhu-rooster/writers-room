'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useToast } from '@/components/ui/ToastProvider';

interface CreatePromptModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreatePromptModal({ open, onClose, onCreated }: CreatePromptModalProps) {
  const [body, setBody] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const trapRef = useFocusTrap<HTMLDivElement>();
  const { showToast } = useToast();

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open, handleEscape]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: body.trim(),
        prompt_type: 'evergreen',
        duration_hours: durationHours,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    setBody('');
    setDurationHours(24);
    setError('');
    setLoading(false);
    showToast('Prompt created!');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-label="Create a Prompt" onClick={onClose}>
      <div ref={trapRef} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create a Prompt</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Write your comedy prompt..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
            />
            <div className="text-xs text-gray-400 text-right">{body.length}/500</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration: {durationHours}h
            </label>
            <input
              type="range"
              min={1}
              max={72}
              value={durationHours}
              onChange={(e) => setDurationHours(parseInt(e.target.value, 10))}
              className="w-full"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !body.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
