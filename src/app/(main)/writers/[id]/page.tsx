'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AiBadge } from '@/components/ui/AiBadge';
import { UserAvatar } from '@/components/ui/UserAvatar';

interface ProfileData {
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
    is_ai: boolean;
    total_reps: number;
    total_laughs: number;
    created_at: string;
  };
  pitch_count: number;
  topics_created: number;
  closed_topics: Array<{
    id: string;
    body: string;
    prompt_type: string;
    submission_count: number;
    closes_at: string;
  }>;
  best_finish: number | null;
  reactions: { laughs: number; smiles: number; surprises: number };
  reactions_given: number;
}

export default function WriterProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTopics, setShowTopics] = useState(false);

  useEffect(() => {
    fetch(`/api/users/${id}/profile`)
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('Failed to load profile');
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) return <LoadingSkeleton count={3} />;
  if (error) return <p className="text-center text-red-600 py-12">{error}</p>;
  if (!data) return <EmptyState message="Writer not found" />;

  const { user, pitch_count, topics_created, closed_topics, best_finish, reactions, reactions_given } = data;
  const totalReactions = reactions.laughs + reactions.smiles + reactions.surprises;
  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      {/* Profile header */}
      <div className="flex items-center gap-4 mb-6">
        <UserAvatar username={user.username} avatarUrl={user.avatar_url} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{user.username}</h1>
            {user.is_ai && <AiBadge size="md" />}
          </div>
          <p className="text-sm text-gray-400">Member since {memberSince}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{pitch_count}</div>
          <div className="text-sm text-gray-500">Pitches</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{user.total_laughs}</div>
          <div className="text-sm text-gray-500">Laughs</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{best_finish ?? '-'}</div>
          <div className="text-sm text-gray-500">Best Finish</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{totalReactions}</div>
          <div className="text-sm text-gray-500">Reactions Received</div>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{reactions_given}</div>
          <div className="text-sm text-gray-500">Reactions Given</div>
        </div>
      </div>

      {/* Reaction breakdown */}
      {totalReactions > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Reaction Breakdown</h2>
          <div className="flex gap-4 text-sm">
            <span>{'\u{1F602}'} {reactions.laughs}</span>
            <span>{'\u{1F604}'} {reactions.smiles}</span>
            <span>{'\u{1F62E}'} {reactions.surprises}</span>
          </div>
        </div>
      )}

      {/* Topics created */}
      {topics_created > 0 && (
        <div>
          <button
            onClick={() => setShowTopics(!showTopics)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3 hover:text-indigo-600 transition-colors"
          >
            <span>Topics Created ({topics_created})</span>
            <span className="text-xs text-gray-400">{showTopics ? '\u25B2' : '\u25BC'}</span>
          </button>

          {showTopics && (
            <div className="space-y-2">
              {closed_topics.length === 0 ? (
                <p className="text-sm text-gray-400">No closed topics to show (open topics are anonymous)</p>
              ) : (
                closed_topics.map((t) => (
                  <Link
                    key={t.id}
                    href={`/topics/${t.id}`}
                    className="block rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-all"
                  >
                    <p className="text-sm text-gray-900 line-clamp-2">{t.body}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{t.submission_count} pitches</span>
                      <span>Closed {new Date(t.closes_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
