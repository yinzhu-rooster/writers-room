'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { useUser } from '@/hooks/useUser';

const navItems = [
  { href: '/', label: 'Open Topics', authOnly: true },
  { href: '/closed', label: 'Closed Topics', authOnly: false },
  { href: '/leaderboard', label: 'Leaderboard', authOnly: false },
  { href: '/stats', label: 'Stats', authOnly: true },
];

export function Header() {
  const { authUser, loading } = useUser();
  const pathname = usePathname();
  // Track whether we've hydrated to avoid server/client mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const visibleItems = navItems.filter(
    (item) => !item.authOnly || authUser
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={authUser ? '/' : '/closed'} className="text-lg font-bold text-gray-900 shrink-0">
          Writers Room
        </Link>

        {/* Desktop nav links — only show non-auth items until mounted */}
        <nav className="hidden md:flex items-center gap-1 mx-4" role="navigation" aria-label="Main navigation">
          {(mounted ? visibleItems : navItems.filter((i) => !i.authOnly)).map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {!mounted ? null : loading ? null : authUser ? (
            <UserMenu />
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </header>
  );
}
