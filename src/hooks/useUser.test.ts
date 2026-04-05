import { describe, it, expect } from 'vitest';

describe('useUser re-export', () => {
  it('exports useUser from the hooks module', async () => {
    const module = await import('./useUser');
    expect(typeof module.useUser).toBe('function');
  });

  it('re-exports the same useUser as UserProvider', async () => {
    const hooksModule = await import('./useUser');
    const providerModule = await import('@/components/auth/UserProvider');
    expect(hooksModule.useUser).toBe(providerModule.useUser);
  });
});
