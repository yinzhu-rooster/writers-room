import { describe, it, expect } from 'vitest';
import { serializePitch } from './serialize-pitch';

function makePitch(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pitch-1',
    prompt_id: 'prompt-1',
    body: 'A funny joke',
    user_id: 'user-1',
    created_at: '2026-01-01T12:00:00Z',
    edited_at: null,
    laugh_count: 5,
    smile_count: 2,
    surprise_count: 1,
    total_reaction_count: 8,
    rank: 1,
    is_revealed: true,
    users: { username: 'comedian' },
    reactions: [
      { reaction_type: 'laugh', user_id: 'user-2' },
      { reaction_type: 'smile', user_id: 'user-1' },
    ],
    ...overrides,
  };
}

describe('serializePitch', () => {
  describe('open prompt', () => {
    const opts = { currentUserId: 'user-2', isOpen: true, closesAt: '2026-01-01T18:00:00Z' };

    it('hides reaction counts', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.laugh_count).toBeNull();
      expect(result.smile_count).toBeNull();
      expect(result.surprise_count).toBeNull();
      expect(result.total_reaction_count).toBeNull();
    });

    it('hides rank', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.rank).toBeNull();
    });

    it('hides author for non-own pitches', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.user_id).toBeNull();
      expect(result.username).toBeNull();
    });

    it('shows user_id for own pitches', () => {
      const result = serializePitch(makePitch(), { ...opts, currentUserId: 'user-1' });
      expect(result.user_id).toBe('user-1');
      expect(result.is_own).toBe(true);
    });

    it('includes edit_deadline for own pitches', () => {
      const result = serializePitch(makePitch(), { ...opts, currentUserId: 'user-1' });
      expect(result.edit_deadline).not.toBeNull();
    });

    it('edit_deadline is null for other pitches', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.edit_deadline).toBeNull();
    });

    it('edit_deadline is min of 5min or closes_at', () => {
      // Pitch created at 12:00, closes at 12:03 — deadline should be 12:03
      const earlyClose = '2026-01-01T12:03:00Z';
      const result = serializePitch(makePitch(), { currentUserId: 'user-1', isOpen: true, closesAt: earlyClose });
      expect(result.edit_deadline).toBe(new Date(earlyClose).toISOString());
    });

    it('extracts current user reaction', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.my_reaction).toBe('laugh');
    });
  });

  describe('closed prompt', () => {
    const opts = { currentUserId: 'user-2', isOpen: false, closesAt: '2026-01-01T18:00:00Z' };

    it('shows reaction counts', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.laugh_count).toBe(5);
      expect(result.smile_count).toBe(2);
      expect(result.surprise_count).toBe(1);
    });

    it('shows rank', () => {
      const result = serializePitch(makePitch(), opts);
      expect(result.rank).toBe(1);
    });

    it('shows author when revealed', () => {
      const result = serializePitch(makePitch({ is_revealed: true }), opts);
      expect(result.username).toBe('comedian');
      expect(result.user_id).toBe('user-1');
    });

    it('hides author when not revealed and not own', () => {
      const result = serializePitch(makePitch({ is_revealed: false }), opts);
      expect(result.username).toBeNull();
      expect(result.user_id).toBeNull();
    });

    it('shows author for own pitch even when not revealed', () => {
      const result = serializePitch(makePitch({ is_revealed: false }), { ...opts, currentUserId: 'user-1' });
      expect(result.username).toBe('comedian');
      expect(result.user_id).toBe('user-1');
    });

    it('edit_deadline is always null for closed prompts', () => {
      const result = serializePitch(makePitch(), { ...opts, currentUserId: 'user-1' });
      expect(result.edit_deadline).toBeNull();
    });
  });

  describe('unauthenticated user', () => {
    it('my_reaction is null when no user', () => {
      const result = serializePitch(makePitch(), { currentUserId: null, isOpen: false, closesAt: '2026-01-01T18:00:00Z' });
      expect(result.my_reaction).toBeNull();
      expect(result.is_own).toBe(false);
    });
  });
});
