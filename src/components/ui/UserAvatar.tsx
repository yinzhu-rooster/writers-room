'use client';

import { useState } from 'react';

interface UserAvatarProps {
  username: string;
  avatarUrl: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-2xl',
};

export function UserAvatar({ username, avatarUrl, size = 'md' }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const initial = (username ?? 'U')[0].toUpperCase();

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizeClass} rounded-full shrink-0 object-cover`}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium shrink-0`}>
      {initial}
    </div>
  );
}
