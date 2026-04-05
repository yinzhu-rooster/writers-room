'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface CommunityStats {
  total_writers: number;
  total_topics: number;
  total_pitches: number;
  total_votes: number;
}

export default function StatsPage() {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => { if (!r.ok) throw new Error('Failed to load'); return r.json(); })
      .then((data) => { setStats(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingSkeleton count={2} />;
  if (error) return <p className="text-center text-red-600 py-12">{error}</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Community Stats</h1>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/writers"
          className="rounded-xl border border-gray-200 p-5 text-center hover:border-indigo-300 hover:shadow-sm transition-all"
        >
          <div className="text-3xl font-bold text-gray-900">{stats?.total_writers ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Writers</div>
        </Link>

        <div className="rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-gray-900">{stats?.total_topics ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Topics</div>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-gray-900">{stats?.total_pitches ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Pitches</div>
        </div>

        <div className="rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-3xl font-bold text-gray-900">{stats?.total_votes ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">Votes</div>
        </div>
      </div>
    </div>
  );
}
