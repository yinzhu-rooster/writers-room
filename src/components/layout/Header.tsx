'use client';

import Link from 'next/link';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { useUser } from '@/hooks/useUser';

export function Header() {
  const { authUser, loading } = useUser();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Writers Room
        </Link>
        <div className="flex items-center gap-3">
          {!loading && (authUser ? <UserMenu /> : <LoginButton />)}
        </div>
      </div>
    </header>
  );
}
