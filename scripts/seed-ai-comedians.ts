/**
 * Seed script — creates Supabase auth + users rows for 8 AI comedian bots.
 * Idempotent: skips bots that already exist.
 *
 * Usage: npx tsx scripts/seed-ai-comedians.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY env var is required');

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const COMEDIANS = [
  { id: 'a1000001-0000-0000-0000-000000000001', username: 'DeadpanDave', email: 'deadpan-dave@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000002', username: 'PunPatricia', email: 'pun-patricia@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000003', username: 'DarkDoug', email: 'dark-doug@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000004', username: 'SurrealSally', email: 'surreal-sally@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000005', username: 'ObservationalOllie', email: 'observational-ollie@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000006', username: 'OneLinerLisa', email: 'one-liner-lisa@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000007', username: 'RoastMasterMike', email: 'roast-master-mike@writersroom.ai' },
  { id: 'a1000001-0000-0000-0000-000000000008', username: 'WholesomeWendy', email: 'wholesome-wendy@writersroom.ai' },
];

async function main() {
  console.log('Seeding 8 AI comedian accounts...\n');

  for (const bot of COMEDIANS) {
    // Check if users row already exists
    const { data: existing } = await admin
      .from('users')
      .select('id')
      .eq('id', bot.id)
      .single();

    if (existing) {
      console.log(`  ✓ ${bot.username} — already exists, skipping`);
      continue;
    }

    // Create auth user with predetermined ID
    const { error: authError } = await admin.auth.admin.createUser({
      id: bot.id,
      email: bot.email,
      password: `bot-${bot.id}`,
      email_confirm: true,
    });

    if (authError && !authError.message.includes('already been registered')) {
      console.error(`  ✗ ${bot.username} — auth error: ${authError.message}`);
      continue;
    }

    // Create users row
    const { error: userError } = await admin.from('users').upsert({
      id: bot.id,
      username: bot.username,
      email: bot.email,
      is_ai: true,
      is_admin: false,
    });

    if (userError) {
      console.error(`  ✗ ${bot.username} — users error: ${userError.message}`);
      continue;
    }

    console.log(`  ✓ ${bot.username} — created`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
