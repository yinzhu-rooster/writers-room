import { NextResponse } from 'next/server';
import type { ApiError } from './api-error';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

function ensureCleanup() {
  if (cleanupTimer || typeof setInterval === 'undefined') return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
    if (store.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }, 5 * 60 * 1000);
  // Allow the process to exit naturally in serverless/test environments
  if (cleanupTimer && typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * Best-effort in-memory rate limiter.
 *
 * NOTE: This is per-isolate only. In serverless environments (Vercel),
 * each cold start gets its own store, so this is not a hard guarantee.
 *
 * TODO: Replace with Upstash Redis for production:
 *   npm install @upstash/ratelimit @upstash/redis
 *
 * Returns null if allowed, or a 429 NextResponse if rate-limited.
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
    ensureCleanup();
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
