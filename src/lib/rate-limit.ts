import { NextResponse } from 'next/server';
import type { ApiError } from './api-error';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Simple in-memory rate limiter.
 * Returns null if allowed, or a 429 NextResponse if rate-limited.
 *
 * @param key - Unique key (e.g., `userId:endpoint`)
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds (default 60s)
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): NextResponse<ApiError> | null {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      },
    );
  }

  return null;
}
