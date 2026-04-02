'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

const navItems = [
  { href: '/', label: 'Open', authOnly: true },
  { href: '/closed', label: 'Closed', authOnly: false },
  { href: '/leaderboard', label: 'Board', authOnly: false },
  { href: '/stats', label: 'Stats', authOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { authUser } = useUser();

  const visibleItems = navItems.filter(
    (item) => !item.authOnly || authUser
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around h-14">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full text-xs font-medium transition-colors ${
                isActive
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
