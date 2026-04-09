/**
 * Insert AI-generated daily prompts and comedian pitches into Supabase.
 * Called by Claude Code scheduled trigger — Claude generates the content,
 * this script handles the DB insertion.
 *
 * Usage: npx tsx scripts/insert-daily-content.ts <json-file>
 *
 * The JSON file should have the shape:
 * {
 *   "prompts": [{ "body": "...", "prompt_type": "headline|setup|format|topical|evergreen" }, ...],
 *   "pitches": [{ "comedian_id": "...", "prompt_index": 0, "body": "..." }, ...]
 * }
 *
 * - prompt_index refers to the index in the prompts array (so pitches can reference
 *   prompts that were just inserted and don't have IDs yet)
 * - comedian_id is the UUID of the AI comedian
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required');

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

interface PromptInput {
  body: string;
  prompt_type: 'headline' | 'setup' | 'format' | 'topical' | 'evergreen';
}

interface PitchInput {
  comedian_id: string;
  prompt_index: number;
  body: string;
}

interface DailyContent {
  prompts: PromptInput[];
  pitches: PitchInput[];
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: npx tsx scripts/insert-daily-content.ts <json-file>');
    process.exit(1);
  }

  const content: DailyContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));

  // Opens now, closes 24 hours from now
  const now = new Date();
  const opensAt = now;
  const closesAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // --- Idempotency: check if today's system prompts already exist ---
  // Check for any system prompts created today (UTC day)
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const { count } = await admin
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('is_system_generated', true)
    .gte('created_at', todayStart.toISOString())
    .lt('created_at', tomorrowStart.toISOString());

  if ((count ?? 0) > 0) {
    console.log(`Already generated ${count} prompts for today — skipping prompt insertion.`);
    // Still try pitches in case those are missing
    await insertPitches(content.pitches, []);
    return;
  }

  // --- Insert prompts ---
  console.log(`Inserting ${content.prompts.length} prompts...`);
  const { data: insertedPrompts, error: promptError } = await admin
    .from('prompts')
    .insert(
      content.prompts.map((p) => ({
        body: p.body,
        prompt_type: p.prompt_type,
        is_system_generated: true,
        created_by: 'a1000001-0000-0000-0000-000000000009', // EddyEditor
        opens_at: opensAt.toISOString(),
        closes_at: closesAt.toISOString(),
      }))
    )
    .select('id, prompt_type');

  if (promptError) {
    console.error('Failed to insert prompts:', promptError.message);
    process.exit(1);
  }

  console.log(`Inserted ${insertedPrompts.length} prompts.`);

  // --- Insert pitches ---
  await insertPitches(content.pitches, insertedPrompts);
}

async function insertPitches(
  pitches: PitchInput[],
  insertedPrompts: { id: string; prompt_type: string }[],
) {
  if (pitches.length === 0) {
    console.log('No pitches to insert.');
    return;
  }

  // If we have freshly inserted prompts, map prompt_index -> prompt_id
  // If prompts were already inserted (idempotency), fetch today's prompts
  let promptIds: string[];

  if (insertedPrompts.length > 0) {
    promptIds = insertedPrompts.map((p) => p.id);
  } else {
    // Fetch today's system-generated prompts
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const { data: openPrompts } = await admin
      .from('prompts')
      .select('id')
      .eq('is_system_generated', true)
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString())
      .order('created_at', { ascending: true });

    if (!openPrompts?.length) {
      console.log('No open prompts found for pitches.');
      return;
    }
    promptIds = openPrompts.map((p) => p.id);
  }

  // Map pitches to DB rows
  const pitchRows = pitches
    .filter((p) => p.prompt_index < promptIds.length)
    .map((p) => ({
      prompt_id: promptIds[p.prompt_index],
      user_id: p.comedian_id,
      body: p.body,
    }));

  // Check for already-inserted pitches (idempotency)
  const comedianIds = [...new Set(pitchRows.map((p) => p.user_id))];
  const { data: existing } = await admin
    .from('pitches')
    .select('prompt_id, user_id')
    .in('user_id', comedianIds)
    .in('prompt_id', promptIds);

  const existingSet = new Set(
    (existing ?? []).map((e) => `${e.user_id}:${e.prompt_id}`)
  );

  const newPitches = pitchRows.filter(
    (p) => !existingSet.has(`${p.user_id}:${p.prompt_id}`)
  );

  if (newPitches.length === 0) {
    console.log('All pitches already exist — skipping.');
    return;
  }

  console.log(`Inserting ${newPitches.length} pitches...`);
  const { error: pitchError } = await admin.from('pitches').insert(newPitches);

  if (pitchError) {
    console.error('Failed to insert pitches:', pitchError.message);
    process.exit(1);
  }

  console.log(`Inserted ${newPitches.length} pitches.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
