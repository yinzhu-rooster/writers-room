'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';

export function UserMenu() {
  const { profile, loading } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<(HTMLAnchorElement | HTMLButtonElement)[]>([]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    // Focus first menu item when opened
    requestAnimationFrame(() => {
      menuItemsRef.current[0]?.focus();
    });

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuItemsRef.current.filter(Boolean);
    if (items.length === 0) return;
    const idx = items.indexOf(e.target as HTMLAnchorElement | HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    }
  }, []);

  if (loading) return <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />;
  if (!profile) return null;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/closed';
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-2"
      >
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username ?? ''}
            className="h-8 w-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
            {(profile.username ?? 'U')[0].toUpperCase()}
          </div>
        )}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 py-1 z-50" onKeyDown={handleMenuKeyDown}>
          <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-100">
            {profile.username}
          </div>
          <a
            href="/stats"
            role="menuitem"
            tabIndex={-1}
            ref={el => { if (el) menuItemsRef.current[0] = el; }}
            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            Your Stats
          </a>
          <a
            href="/settings"
            role="menuitem"
            tabIndex={-1}
            ref={el => { if (el) menuItemsRef.current[1] = el; }}
            className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
          >
            Settings
          </a>
          <button
            onClick={handleSignOut}
            role="menuitem"
            tabIndex={-1}
            ref={el => { if (el) menuItemsRef.current[2] = el; }}
            className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-50"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
