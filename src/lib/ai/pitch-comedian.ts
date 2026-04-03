import type { PromptType } from '@/types/enums';
import { type AIComedian, COMEDIAN_PITCHES } from './comedians';

interface PitchOutput {
  prompt_id: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Seeded RNG — same as prompt-generator.ts
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
  }
  return hash;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate pitches for a comedian across a set of open prompts.
 * Returns 1-3 pitches per prompt, deterministic per comedian+prompt+day.
 */
export function generateComedianPitches(
  comedian: AIComedian,
  prompts: { id: string; body: string; prompt_type: PromptType }[],
  daySeed: number,
): PitchOutput[] {
  const pitchPool = COMEDIAN_PITCHES[comedian.id];
  if (!pitchPool) return [];

  const results: PitchOutput[] = [];

  for (const prompt of prompts) {
    const pool = pitchPool[prompt.prompt_type];
    if (!pool || pool.length === 0) continue;

    // Seed based on comedian + prompt + day for determinism
    const seed = daySeed + hashString(`${comedian.id}:${prompt.id}`);
    const rand = seededRandom(seed);

    // 1-3 pitches: weighted toward 1 (50%), 2 (35%), 3 (15%)
    const roll = rand();
    const count = roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;

    // Pick unique pitches from pool
    const shuffled = [...pool].sort(() => rand() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, pool.length));

    for (const body of selected) {
      results.push({ prompt_id: prompt.id, body });
    }
  }

  return results;
}

/**
 * Get the hour (9-17 ET) when a comedian should pitch for a given day.
 * Spreads 8 comedians across the 9-hour window.
 */
export function getComedianPitchHour(comedianId: string, daySeed: number): number {
  const hash = hashString(`${comedianId}:${daySeed}`);
  return (hash % 9) + 9; // 9-17 (9AM-5PM ET)
}
