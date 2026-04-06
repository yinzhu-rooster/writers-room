'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';

export default function OnboardingPage() {
  const { authUser, loading: authLoading } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <p className="text-gray-500">Please sign in to complete onboarding.</p>
          <a href="/closed" className="mt-4 inline-block text-indigo-600 hover:underline">Go to home</a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError('Username must be 3-20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: trimmed }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Something went wrong');
      setLoading(false);
      return;
    }

    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Writers Room</h1>
        <p className="text-gray-500 mb-6">Pick a username to get started</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="onboarding-username" className="sr-only">Username</label>
            <input
              id="onboarding-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              maxLength={20}
              autoComplete="username"
              aria-invalid={!!error}
              aria-describedby={error ? 'onboarding-error' : undefined}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            {error && <p id="onboarding-error" className="mt-1 text-sm text-red-600" role="alert">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Setting up...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
