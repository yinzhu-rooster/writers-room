'use client';

import { useEffect, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface PitchFlagEntry {
  id: string;
  reason: string;
  created_at: string;
  pitches: { body: string; user_id: string };
  users: { username: string };
}

interface PromptFlagEntry {
  id: string;
  reason: string;
  created_at: string;
  prompts: { body: string };
  users: { username: string };
}

export default function AdminFlagsPage() {
  const [pitchFlags, setPitchFlags] = useState<PitchFlagEntry[]>([]);
  const [promptFlags, setPromptFlags] = useState<PromptFlagEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/flags')
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.json();
      })
      .then((data) => {
        setPitchFlags(data.pitch_flags);
        setPromptFlags(data.prompt_flags);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton count={2} height="h-16" />;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Flagged Content</h1>

      <h2 className="text-sm font-medium text-gray-700 mb-3">Pitch Flags ({pitchFlags.length})</h2>
      <div className="space-y-2 mb-8">
        {pitchFlags.map((f) => (
          <div key={f.id} className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-red-600 font-medium">{f.reason}</span>
              <span className="text-gray-400">{new Date(f.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-gray-700 mt-1 line-clamp-2">{f.pitches?.body ?? '[deleted]'}</p>
            <p className="text-gray-400 text-xs mt-1">Flagged by {f.users?.username ?? 'unknown'}</p>
          </div>
        ))}
        {pitchFlags.length === 0 && <p className="text-sm text-gray-500">No pitch flags</p>}
      </div>

      <h2 className="text-sm font-medium text-gray-700 mb-3">Prompt Flags ({promptFlags.length})</h2>
      <div className="space-y-2">
        {promptFlags.map((f) => (
          <div key={f.id} className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-red-600 font-medium">{f.reason}</span>
              <span className="text-gray-400">{new Date(f.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-gray-700 mt-1 line-clamp-2">{f.prompts?.body ?? '[deleted]'}</p>
            <p className="text-gray-400 text-xs mt-1">Flagged by {f.users?.username ?? 'unknown'}</p>
          </div>
        ))}
        {promptFlags.length === 0 && <p className="text-sm text-gray-500">No prompt flags</p>}
      </div>
    </div>
  );
}
