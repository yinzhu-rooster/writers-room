'use client';

import { useEffect, useState } from 'react';

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function CountdownTimer({ closesAt }: { closesAt: string }) {
  const [timeLeft, setTimeLeft] = useState(() => new Date(closesAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(new Date(closesAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [closesAt]);

  const isClosed = timeLeft <= 0;

  return (
    <span className={`text-sm font-medium ${isClosed ? 'text-gray-400' : 'text-amber-600'}`}>
      {formatTimeLeft(timeLeft)}
    </span>
  );
}
