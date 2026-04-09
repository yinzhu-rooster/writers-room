'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { useToast } from '@/components/ui/ToastProvider';
import { useTheme } from '@/components/ui/ThemeProvider';

export default function SettingsPage() {
  const { profile, loading: userLoading } = useUser();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (profile?.username) setUsername(profile.username);
  }, [profile]);

  if (userLoading) return <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />;
  if (!profile) return <p className="text-center text-gray-500 py-12">Sign in to access settings</p>;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        showToast(data.error, 'error');
      } else {
        showToast('Settings saved');
      }
    } catch {
      setError('Network error — please try again');
      showToast('Network error — please try again', 'error');
    }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={handleSave} className="space-y-4 max-w-sm">
        <div>
          <label htmlFor="settings-username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <input
            id="settings-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            autoComplete="username"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div>
          <label htmlFor="settings-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="settings-email"
            type="email"
            value={profile.email}
            disabled
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Notification Preferences</h2>
        <p className="text-sm text-gray-400">Coming soon</p>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h2 className="text-sm font-medium text-gray-700 mb-2">Display Preferences</h2>
        <div className="flex gap-2 mt-3">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${
                theme === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
