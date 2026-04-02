import { describe, it, expect } from 'vitest';
import { hashSeed, seededShuffle } from './shuffle';

describe('hashSeed', () => {
  it('returns a number', () => {
    expect(typeof hashSeed('test')).toBe('number');
  });

  it('is deterministic', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'));
  });

  it('produces different hashes for different strings', () => {
    expect(hashSeed('abc')).not.toBe(hashSeed('def'));
  });

  it('returns unsigned 32-bit integer', () => {
    const h = hashSeed('any-string');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});

describe('seededShuffle', () => {
  it('is deterministic with same seed', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    seededShuffle(a, 42);
    seededShuffle(b, 42);
    expect(a).toEqual(b);
  });

  it('produces different order with different seed', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const b = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    seededShuffle(a, 42);
    seededShuffle(b, 99);
    expect(a).not.toEqual(b);
  });

  it('preserves all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    seededShuffle(arr, 123);
    expect(arr.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('actually shuffles (not identity for non-trivial arrays)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const original = [...arr];
    seededShuffle(arr, 7);
    expect(arr).not.toEqual(original);
  });

  it('handles empty array', () => {
    const arr: number[] = [];
    seededShuffle(arr, 42);
    expect(arr).toEqual([]);
  });

  it('handles single-element array', () => {
    const arr = [1];
    seededShuffle(arr, 42);
    expect(arr).toEqual([1]);
  });
});
