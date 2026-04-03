'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

interface PitchInputProps {
  promptId: string;
  onSubmitted: () => void;
}

export function PitchInput({ promptId, onSubmitted }: PitchInputProps) {
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setError('');
    setLoading(true);

    const res = await fetch(`/api/prompts/${promptId}/pitches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      showToast(data.error, 'error');
      setLoading(false);
      return;
    }

    setBody('');
    setLoading(false);
    showToast('Pitch submitted!');
    onSubmitted();
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Write your pitch..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">{body.length}/1000</span>
        {error && <span className="text-xs text-red-600">{error}</span>}
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </form>
  );
}
