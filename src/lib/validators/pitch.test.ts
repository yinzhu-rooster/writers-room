import { describe, it, expect } from 'vitest';
import { createPitchSchema, updatePitchSchema } from './pitch';

describe('createPitchSchema', () => {
  it('accepts valid pitch body', () => {
    expect(createPitchSchema.safeParse({ body: 'A funny joke' }).success).toBe(true);
  });

  it('rejects empty body', () => {
    expect(createPitchSchema.safeParse({ body: '' }).success).toBe(false);
  });

  it('rejects body over 1000 chars', () => {
    expect(createPitchSchema.safeParse({ body: 'x'.repeat(1001) }).success).toBe(false);
  });

  it('accepts body at exactly 1000 chars', () => {
    expect(createPitchSchema.safeParse({ body: 'x'.repeat(1000) }).success).toBe(true);
  });

  it('rejects missing body', () => {
    expect(createPitchSchema.safeParse({}).success).toBe(false);
  });
});

describe('updatePitchSchema', () => {
  it('accepts valid body', () => {
    expect(updatePitchSchema.safeParse({ body: 'Updated joke' }).success).toBe(true);
  });

  it('rejects empty body', () => {
    expect(updatePitchSchema.safeParse({ body: '' }).success).toBe(false);
  });
});
