import { describe, it, expect } from 'vitest';
import { rankPitches } from './ranking';

describe('rankPitches', () => {
  it('returns empty array for no pitches', () => {
    expect(rankPitches([])).toEqual([]);
  });

  it('ranks a single pitch as #1', () => {
    const result = rankPitches([
      { id: 'a', laugh_count: 5, created_at: '2024-01-01T00:00:00Z' },
    ]);
    expect(result).toEqual([{ id: 'a', rank: 1 }]);
  });

  it('ranks by laugh_count descending', () => {
    const result = rankPitches([
      { id: 'a', laugh_count: 3, created_at: '2024-01-01T00:00:00Z' },
      { id: 'b', laugh_count: 10, created_at: '2024-01-01T01:00:00Z' },
      { id: 'c', laugh_count: 5, created_at: '2024-01-01T02:00:00Z' },
    ]);
    expect(result).toEqual([
      { id: 'b', rank: 1 },
      { id: 'c', rank: 2 },
      { id: 'a', rank: 3 },
    ]);
  });

  it('ties share the same rank', () => {
    const result = rankPitches([
      { id: 'a', laugh_count: 5, created_at: '2024-01-01T00:00:00Z' },
      { id: 'b', laugh_count: 5, created_at: '2024-01-01T01:00:00Z' },
      { id: 'c', laugh_count: 3, created_at: '2024-01-01T02:00:00Z' },
    ]);
    expect(result).toEqual([
      { id: 'a', rank: 1 },
      { id: 'b', rank: 1 },
      { id: 'c', rank: 3 },
    ]);
  });

  it('uses created_at as tiebreaker (earlier = higher position)', () => {
    const result = rankPitches([
      { id: 'a', laugh_count: 5, created_at: '2024-01-01T02:00:00Z' },
      { id: 'b', laugh_count: 5, created_at: '2024-01-01T00:00:00Z' },
    ]);
    // Both share rank 1, but b comes first (earlier)
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
    expect(result[0].rank).toBe(1);
    expect(result[1].rank).toBe(1);
  });

  it('handles all same count', () => {
    const result = rankPitches([
      { id: 'a', laugh_count: 0, created_at: '2024-01-01T00:00:00Z' },
      { id: 'b', laugh_count: 0, created_at: '2024-01-01T01:00:00Z' },
      { id: 'c', laugh_count: 0, created_at: '2024-01-01T02:00:00Z' },
    ]);
    expect(result.every((r) => r.rank === 1)).toBe(true);
  });
});
