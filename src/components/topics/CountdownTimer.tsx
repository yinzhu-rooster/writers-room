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
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      const remaining = closesAtMs - Date.now();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (interval) clearInterval(interval);
        onExpiredRef.current?.();
      }
    };

    const startTicking = () => {
      tick();
      interval = setInterval(tick, 1000);
    };

    const stopTicking = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const observer = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? startTicking() : stopTicking(); },
      { threshold: 0 }
    );

    if (elementRef.current) observer.observe(elementRef.current);
    return () => { stopTicking(); observer.disconnect(); };
  }, [closesAtMs]);

  const isClosed = timeLeft <= 0;

  return (
    <span ref={elementRef} className={`text-sm font-medium ${isClosed ? 'text-gray-400' : 'text-amber-600'}`}>
      {formatTimeLeft(timeLeft)}
    </span>
  );
}
