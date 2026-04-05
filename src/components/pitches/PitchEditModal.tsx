'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useToast } from '@/components/ui/ToastProvider';

interface PitchEditModalProps {
  pitchId: string;
  initialBody: string;
  onClose: () => void;
  onSaved: () => void;
}

export function PitchEditModal({ pitchId, initialBody, onClose, onSaved }: PitchEditModalProps) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const trapRef = useFocusTrap<HTMLDivElement>();
  const { showToast } = useToast();

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch(`/api/pitches/${pitchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    showToast('Pitch updated');
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-label="Edit Pitch" onClick={onClose}>
      <div ref={trapRef} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Pitch</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-pitch-body" className="sr-only">Pitch body</label>
            <textarea
              id="edit-pitch-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
            />
            <div className="text-xs text-gray-400 text-right">{body.length}/1000</div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              type="submit"
              disabled={loading || !body.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
