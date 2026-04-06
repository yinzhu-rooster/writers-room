'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Closed';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function CountdownTimer({ closesAt, onExpired }: { closesAt: string; onExpired?: () => void }) {
  const closesAtMs = useMemo(() => new Date(closesAt).getTime(), [closesAt]);
  const [timeLeft, setTimeLeft] = useState(() => closesAtMs - Date.now());
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = closesAtMs - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onExpiredRef.current?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [closesAtMs]);

  const isClosed = timeLeft <= 0;

  return (
    <span className={`text-sm font-medium ${isClosed ? 'text-gray-400' : 'text-amber-600'}`}>
      {formatTimeLeft(timeLeft)}
    </span>
  );
}
