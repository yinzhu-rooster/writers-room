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

interface TopicFlagEntry {
  id: string;
  reason: string;
  created_at: string;
  prompts: { body: string };
  users: { username: string };
}

export default function AdminFlagsPage() {
  const [pitchFlags, setPitchFlags] = useState<PitchFlagEntry[]>([]);
  const [topicFlags, setTopicFlags] = useState<TopicFlagEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const loadFlags = () => {
    setLoading(true);
    fetch('/api/admin/flags')
      .then(async (r) => {
        if (!r.ok) {
          let msg = 'Failed to load flags';
          try { msg = (await r.json()).error ?? msg; } catch { /* non-JSON response */ }
          throw new Error(msg);
        }
        return r.json();
      })
      .then((data) => {
        setPitchFlags(data.pitch_flags);
        setTopicFlags(data.prompt_flags);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadFlags(); }, []);

  const handleAction = async (flagId: string, flagType: 'pitch' | 'topic', action: 'dismiss' | 'delete_content') => {
    if (action === 'delete_content' && !confirm('Delete this content? This cannot be undone.')) return;
    setActing(flagId);
    try {
      const res = await fetch('/api/admin/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flag_id: flagId, flag_type: flagType, action }),
      });
      if (!res.ok) throw new Error('Action failed');
      loadFlags();
    } catch {
      setError('Failed to perform action');
    }
    setActing(null);
  };

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
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAction(f.id, 'pitch', 'dismiss')}
                disabled={acting === f.id}
                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAction(f.id, 'pitch', 'delete_content')}
                disabled={acting === f.id}
                className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Delete Pitch
              </button>
            </div>
          </div>
        ))}
        {pitchFlags.length === 0 && <p className="text-sm text-gray-500">No pitch flags</p>}
      </div>

      <h2 className="text-sm font-medium text-gray-700 mb-3">Topic Flags ({topicFlags.length})</h2>
      <div className="space-y-2">
        {topicFlags.map((f) => (
          <div key={f.id} className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-red-600 font-medium">{f.reason}</span>
              <span className="text-gray-400">{new Date(f.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-gray-700 mt-1 line-clamp-2">{f.prompts?.body ?? '[deleted]'}</p>
            <p className="text-gray-400 text-xs mt-1">Flagged by {f.users?.username ?? 'unknown'}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleAction(f.id, 'topic', 'dismiss')}
                disabled={acting === f.id}
                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAction(f.id, 'topic', 'delete_content')}
                disabled={acting === f.id}
                className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Delete Topic
              </button>
            </div>
          </div>
        ))}
        {topicFlags.length === 0 && <p className="text-sm text-gray-500">No topic flags</p>}
      </div>
    </div>
  );
}
