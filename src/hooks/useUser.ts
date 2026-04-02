'use client';

// Re-export from the context provider — all consumers share a single auth state
export { useUser } from '@/components/auth/UserProvider';
