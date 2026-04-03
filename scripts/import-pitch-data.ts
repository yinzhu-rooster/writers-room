/**
 * Import data from the legacy Pitch app (Parse/MongoDB) into Writers Room (Supabase).
 *
 * Reads BSON dump files via bsondump, maps to our schema, and upserts into Supabase.
 * Merge-safe: existing data is preserved, duplicates are skipped via ON CONFLICT.
 *
 * Usage: npx tsx scripts/import-pitch-data.ts [--limit N] [--skip-votes]
 *
 * Reusable: safe to run multiple times. Uses deterministic UUIDs so re-imports merge cleanly.
 */

import { execSync } from 'child_process';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { createClient } from '@supabase/supabase-js';
import { v5 as uuidv5 } from 'uuid';
import { spawn } from 'child_process';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required');
const DUMP_DIR = `${__dirname}/../pitch-server/pitchprod/pitch`;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const skipVotes = args.includes('--skip-votes');

const NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
function oldIdToUuid(oldId: string, prefix: string): string {
  return uuidv5(`pitch-import:${prefix}:${oldId}`, NS);
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v && typeof v === 'object' && '$numberInt' in v) return parseInt((v as Record<string, string>).$numberInt, 10);
  if (v && typeof v === 'object' && '$numberLong' in v) return parseInt((v as Record<string, string>).$numberLong, 10);
  return 0;
}

function parseDate(v: unknown): string | null {
  if (!v) return null;
  if (v && typeof v === 'object' && '$date' in v) {
    const d = (v as Record<string, unknown>).$date;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object' && '$numberLong' in d) {
      return new Date(parseInt((d as Record<string, string>).$numberLong, 10)).toISOString();
    }
  }
  return null;
}

/** Stream BSON collection line by line via bsondump */
async function* streamBson(collection: string): AsyncGenerator<Record<string, unknown>> {
  const bsonPath = `${DUMP_DIR}/${collection}.bson`;
  const proc = spawn('bsondump', ['--quiet', bsonPath]);
  const rl = createInterface({ input: proc.stdout! });
  for await (const line of rl) {
    if (line.trim()) yield JSON.parse(line);
  }
}

/** Read small collection fully into memory */
function readBsonFull(collection: string): Record<string, unknown>[] {
  const bsonPath = `${DUMP_DIR}/${collection}.bson`;
  const raw = execSync(`bsondump --quiet "${bsonPath}"`, { maxBuffer: 500 * 1024 * 1024 }).toString();
  return raw.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

async function upsertBatch(table: string, rows: Record<string, unknown>[], onConflict: string) {
  const { error } = await admin.from(table).upsert(rows, { onConflict, ignoreDuplicates: true });
  if (error) console.error(`  Error in ${table}: ${error.message}`);
  return !error;
}

/** Create auth.users entry via Supabase Auth Admin API */
async function createAuthUser(id: string, email: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
    },
    body: JSON.stringify({
      id,
      email,
      email_confirm: true,
      app_metadata: { provider: 'import' },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // 422 = already exists, that's fine
    if (res.status === 422) return true;
    const msg = String(body?.msg || body?.message || body?.detail || '');
    if (msg.includes('already been registered') || msg.includes('already exists') || msg.includes('duplicate key')) return true;
    console.error(`  Auth user error (${res.status}): ${JSON.stringify(body)}`);
    return false;
  }
  return true;
}

async function main() {
  // ---- Users (small, fits in memory) ----
  console.log('\n=== Importing users ===');
  const users = readBsonFull('_User');
  const userIdMap = new Map<string, string>();
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();

  // First pass: build user list and create auth entries
  interface UserRow {
    id: string; username: string; email: string; avatar_url: string | null;
    is_ai: boolean; is_admin: boolean; total_reps: number; total_laughs: number; created_at: string;
  }
  const userRows: UserRow[] = [];

  for (const u of users) {
    const sn = u.screenName as string;
    if (!sn) continue;
    const lower = sn.toLowerCase().slice(0, 20);
    if (seenUsernames.has(lower)) continue;
    seenUsernames.add(lower);

    const newId = oldIdToUuid(u._id as string, 'user');
    userIdMap.set(u._id as string, newId);

    let email = (u.email as string) || '';
    // Sanitize email: must be valid format for Supabase Auth
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      email = `import-${u._id}@pitch-import.local`;
    }
    const emailLower = email.toLowerCase();
    if (seenEmails.has(emailLower)) {
      email = `import-${u._id}@pitch-import.local`;
      if (seenEmails.has(email.toLowerCase())) continue;
    }
    seenEmails.add(email.toLowerCase());

    userRows.push({
      id: newId,
      username: sn.slice(0, 20),
      email,
      avatar_url: (u.profileImageUrl as string) || null,
      is_ai: false,
      is_admin: false,
      total_reps: Math.max(0, parseNum(u.pitchesCount)),
      total_laughs: Math.max(0, parseNum(u.funnyCount)),
      created_at: parseDate(u._created_at) ?? new Date().toISOString(),
    });
  }

  // Create auth.users entries (batched with concurrency limit)
  console.log(`  Creating ${userRows.length} auth entries...`);
  let authCount = 0;
  let authFailed = 0;
  const successfulAuthIds = new Set<string>();
  const CONCURRENCY = 5;
  for (let i = 0; i < userRows.length; i += CONCURRENCY) {
    const batch = userRows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(u => createAuthUser(u.id, u.email)));
    results.forEach((ok, j) => {
      if (ok) successfulAuthIds.add(batch[j].id);
      else authFailed++;
    });
    authCount += batch.length;
    if (authCount % 500 === 0) console.log(`  ... ${authCount} auth users (${authFailed} failed)`);
  }
  console.log(`  ${authCount} auth entries attempted, ${successfulAuthIds.size} succeeded, ${authFailed} failed`);

  // Retry failed auth users (sequential, slower but more reliable)
  if (authFailed > 0) {
    const failedRows = userRows.filter(u => !successfulAuthIds.has(u.id));
    console.log(`  Retrying ${failedRows.length} failed auth users (sequential)...`);
    let retryOk = 0;
    for (const u of failedRows) {
      const ok = await createAuthUser(u.id, u.email);
      if (ok) { successfulAuthIds.add(u.id); retryOk++; }
    }
    console.log(`  Retry recovered ${retryOk}/${failedRows.length} users`);
  }

  // Now insert into public.users (only those with successful auth entries)
  let userBatch: Record<string, unknown>[] = [];
  let userCount = 0;
  for (const row of userRows) {
    if (!successfulAuthIds.has(row.id)) continue;
    userBatch.push(row);
    if (userBatch.length >= 200) {
      await upsertBatch('users', userBatch, 'id');
      userCount += userBatch.length;
      userBatch = [];
      if (userCount % 1000 === 0) console.log(`  ... ${userCount} users`);
    }
  }
  if (userBatch.length) { await upsertBatch('users', userBatch, 'id'); userCount += userBatch.length; }

  // Remove failed users from the map so prompts/pitches don't reference them
  for (const [oldId, newId] of userIdMap) {
    if (!successfulAuthIds.has(newId)) userIdMap.delete(oldId);
  }
  console.log(`  ${userCount} users imported (${userIdMap.size} usable)`);

  // ---- Prompts (small-ish, fits in memory) ----
  console.log('\n=== Importing prompts ===');
  const prompts = readBsonFull('Prompt');
  const promptIdMap = new Map<string, string>();
  let promptBatch: Record<string, unknown>[] = [];
  let promptCount = 0;

  for (const p of prompts) {
    if (p.hidden || !p.isPublic || !p.text) continue;
    if (promptCount >= LIMIT) break;

    const newId = oldIdToUuid(p._id as string, 'prompt');
    promptIdMap.set(p._id as string, newId);

    const createdAt = parseDate(p._created_at) ?? parseDate(p.creationDate) ?? new Date().toISOString();
    const closesAt = parseDate(p.expirationDate) ?? new Date(new Date(createdAt).getTime() + 24 * 3600000).toISOString();

    promptBatch.push({
      id: newId,
      body: (p.text as string).slice(0, 500),
      prompt_type: 'evergreen',
      created_by: userIdMap.get(p.userId as string) ?? null,
      is_system_generated: false,
      opens_at: createdAt,
      closes_at: closesAt,
      is_closed_processed: true,
      submission_count: parseNum(p.pitchesCount),
      created_at: createdAt,
    });

    if (promptBatch.length >= 500) {
      await upsertBatch('prompts', promptBatch, 'id');
      promptCount += promptBatch.length;
      promptBatch = [];
      if (promptCount % 5000 === 0) console.log(`  ... ${promptCount} prompts`);
    }
  }
  if (promptBatch.length) { await upsertBatch('prompts', promptBatch, 'id'); promptCount += promptBatch.length; }
  // Only keep actually-imported prompt IDs in the map (for pitch filtering)
  const importedPromptIds = new Set(promptIdMap.values());
  console.log(`  ${promptCount} prompts imported (${importedPromptIds.size} usable)`);

  // ---- Pitches (large, stream) ----
  console.log('\n=== Importing pitches (streaming) ===');
  let pitchBatch: Record<string, unknown>[] = [];
  let pitchCount = 0;
  const pitchIdSet = new Set<string>(); // track for votes

  for await (const p of streamBson('Pitch')) {
    if (p.hidden || !p.text || !p.promptId || !p.userId) continue;
    const promptUuid = promptIdMap.get(p.promptId as string);
    const userUuid = userIdMap.get(p.userId as string);
    if (!promptUuid || !userUuid) continue;
    // Only import pitches for prompts we actually imported
    if (!importedPromptIds.has(promptUuid)) continue;
    if (pitchCount >= LIMIT) break;

    const pitchUuid = oldIdToUuid(p._id as string, 'pitch');
    pitchIdSet.add(p._id as string);

    pitchBatch.push({
      id: pitchUuid,
      prompt_id: promptUuid,
      user_id: userUuid,
      body: (p.text as string).slice(0, 1000),
      laugh_count: Math.max(0, parseNum(p.funnyCount)),
      smile_count: 0,
      surprise_count: 0,
      total_reaction_count: Math.max(0, parseNum(p.funnyCount) + parseNum(p.dieCount)),
      rank: null,
      is_revealed: true,
      created_at: parseDate(p._created_at) ?? parseDate(p.creationDate) ?? new Date().toISOString(),
    });

    if (pitchBatch.length >= 500) {
      await upsertBatch('pitches', pitchBatch, 'id');
      pitchCount += pitchBatch.length;
      pitchBatch = [];
      if (pitchCount % 10000 === 0) console.log(`  ... ${pitchCount} pitches`);
    }
  }
  if (pitchBatch.length) { await upsertBatch('pitches', pitchBatch, 'id'); pitchCount += pitchBatch.length; }
  console.log(`  ${pitchCount} pitches imported`);

  // ---- Votes → Reactions (large, stream) ----
  if (skipVotes) {
    console.log('\n=== Skipping votes (--skip-votes) ===');
  } else {
    console.log('\n=== Importing votes → reactions (streaming) ===');
    let voteBatch: Record<string, unknown>[] = [];
    let voteCount = 0;

    for await (const v of streamBson('Vote')) {
      if (!v.pitchId || !v.userId) continue;
      // Only import funny votes as "laugh" reactions
      if (!v.funny) continue;
      if (!pitchIdSet.has(v.pitchId as string)) continue;
      const userUuid = userIdMap.get(v.userId as string);
      if (!userUuid) continue;
      if (voteCount >= LIMIT) break;

      voteBatch.push({
        id: oldIdToUuid(v._id as string, 'vote'),
        pitch_id: oldIdToUuid(v.pitchId as string, 'pitch'),
        user_id: userUuid,
        reaction_type: 'laugh',
        created_at: parseDate(v._created_at) ?? new Date().toISOString(),
      });

      if (voteBatch.length >= 500) {
        await upsertBatch('reactions', voteBatch, 'id');
        voteCount += voteBatch.length;
        voteBatch = [];
        if (voteCount % 10000 === 0) console.log(`  ... ${voteCount} reactions`);
      }
    }
    if (voteBatch.length) { await upsertBatch('reactions', voteBatch, 'id'); voteCount += voteBatch.length; }
    console.log(`  ${voteCount} reactions imported`);
  }

  console.log('\n=== Import complete! ===');
}

main().catch(console.error);
