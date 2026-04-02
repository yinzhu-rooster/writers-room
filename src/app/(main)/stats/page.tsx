'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/hooks/useUser';

interface StatsData {
  user: { username: string; total_reps: number; total_laughs: number };
  best_finish: number | null;
  reaction_breakdown: { laughs: number; smiles: number; surprises: number };
  pitch_history: Array<{
    id: string;
    body: string;
    laugh_count: number;
    smile_count: number;
    surprise_count: number;
    rank: number | null;
    created_at: string;
    prompts: { body: string };
  }>;
}

export default function StatsPage() {
  const { profile, loading: userLoading } = useUser();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    fetch(`/api/users/${profile.id}/stats`)
      .then((r) => r.json())
      .then((data) => { setStats(data); setLoading(false); });
  }, [profile]);

  if (userLoading || loading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />)}</div>;
  }

  if (!stats) return <p className="text-center text-gray-500 py-12">Sign in to view your stats</p>;

  const { user, best_finish, reaction_breakdown, pitch_history } = stats;
  const totalReactions = reaction_breakdown.laughs + reaction_breakdown.smiles + reaction_breakdown.surprises;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Your Stats</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{user.total_reps}</div>
          <div className="text-sm text-gray-500">Total Reps</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{user.total_laughs}</div>
          <div className="text-sm text-gray-500">Total Laughs</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{best_finish ?? '-'}</div>
          <div className="text-sm text-gray-500">Best Finish</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalReactions}</div>
          <div className="text-sm text-gray-500">Total Reactions</div>
        </div>
      </div>

      {totalReactions > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Reaction Breakdown</h2>
          <div className="flex gap-4 text-sm">
            <span>{'\u{1F602}'} {reaction_breakdown.laughs} ({Math.round(reaction_breakdown.laughs / totalReactions * 100)}%)</span>
            <span>{'\u{1F604}'} {reaction_breakdown.smiles} ({Math.round(reaction_breakdown.smiles / totalReactions * 100)}%)</span>
            <span>{'\u{1F62E}'} {reaction_breakdown.surprises} ({Math.round(reaction_breakdown.surprises / totalReactions * 100)}%)</span>
          </div>
        </div>
      )}

      <h2 className="text-sm font-medium text-gray-700 mb-3">Pitch History</h2>
      {pitch_history.length === 0 ? (
        <p className="text-sm text-gray-500">No closed pitches yet</p>
      ) : (
        <div className="space-y-3">
          {pitch_history.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-400 mb-1">{(p.prompts as { body: string }).body}</p>
              <p className="text-gray-900 text-sm">{p.body}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {p.rank && <span className="font-medium">#{p.rank}</span>}
                <span>{'\u{1F602}'}{p.laugh_count}</span>
                <span>{'\u{1F604}'}{p.smile_count}</span>
                <span>{'\u{1F62E}'}{p.surprise_count}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
