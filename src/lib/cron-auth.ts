import { timingSafeEqual } from 'crypto';

export function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = `Bearer ${secret}`;
  if (expected.length !== authHeader.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(authHeader));
}
