import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCronSecret } from '@/lib/cron-auth';
import { AI_COMEDIANS } from '@/lib/ai/comedians';
import { generateComedianPitches, getComedianPitchHour } from '@/lib/ai/pitch-comedian';
import type { TopicType } from '@/types/enums';

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Allow ?force=true to skip hour check (for testing)
  const forceAll = new URL(request.url).searchParams.get('force') === 'true';

  // Current time in ET
  const now = new Date();
  const etNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const currentHourET = etNow.getHours();
  const year = etNow.getFullYear();
  const month = etNow.getMonth() + 1;
  const day = etNow.getDate();
  const daySeed = year * 10000 + month * 100 + day;

  // Fetch open prompts
  const { data: openTopics, error: topicError } = await supabase
    .from('prompts')
    .select('id, body, prompt_type')
    .lte('opens_at', now.toISOString())
    .gt('closes_at', now.toISOString());

  if (topicError || !openTopics?.length) {
    return NextResponse.json({ message: 'No open prompts', error: topicError?.message });
  }

  const summary: Record<string, number> = {};
  const skipped: string[] = [];

  for (const comedian of AI_COMEDIANS) {
    // Check if it's this comedian's hour yet
    const pitchHour = getComedianPitchHour(comedian.id, daySeed);
    if (!forceAll && currentHourET < pitchHour) {
      skipped.push(`${comedian.username} (hour ${pitchHour})`);
      continue;
    }

    // Check which prompts this comedian has already pitched on today
    const { data: existingPitches } = await supabase
      .from('pitches')
      .select('prompt_id')
      .eq('user_id', comedian.id)
      .in('prompt_id', openTopics.map((p) => p.id));

    const alreadyPitched = new Set((existingPitches ?? []).map((p) => p.prompt_id));
    const unPitchedTopics = openTopics.filter((p) => !alreadyPitched.has(p.id));

    if (unPitchedTopics.length === 0) {
      skipped.push(`${comedian.username} (already pitched)`);
      continue;
    }

    // Generate pitches
    const pitches = generateComedianPitches(
      comedian,
      unPitchedTopics as { id: string; body: string; prompt_type: TopicType }[],
      daySeed,
    );

    if (pitches.length === 0) continue;

    // Insert
    const { error: insertError } = await supabase.from('pitches').insert(
      pitches.map((p) => ({
        prompt_id: p.prompt_id,
        user_id: comedian.id,
        body: p.body,
      }))
    );

    if (insertError) {
      console.error(`Failed to insert pitches for ${comedian.username}:`, insertError.message);
      continue;
    }

    summary[comedian.username] = pitches.length;
  }

  return NextResponse.json({ pitched: summary, skipped, prompts: openTopics.length });
}
