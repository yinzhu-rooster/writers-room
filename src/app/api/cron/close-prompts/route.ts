import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rankPitches } from '@/lib/ranking';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Find unprocessed closed prompts
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id')
    .lte('closes_at', now)
    .eq('is_closed_processed', false);

  if (!prompts || prompts.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // Get reveal threshold
  const { data: config } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'min_reactions_for_reveal')
    .single();

  const threshold = parseInt(config?.value ?? '3', 10);

  let processed = 0;

  for (const prompt of prompts) {
    // Get non-deleted pitches
    const { data: pitches } = await supabase
      .from('pitches')
      .select('id, laugh_count, total_reaction_count, created_at')
      .eq('prompt_id', prompt.id)
      .is('deleted_at', null);

    if (pitches && pitches.length > 0) {
      const ranked = rankPitches(pitches);

      // Update each pitch with rank and reveal status
      for (const rp of ranked) {
        const pitch = pitches.find((p) => p.id === rp.id)!;
        const { error: updateError } = await supabase
          .from('pitches')
          .update({
            rank: rp.rank,
            is_revealed: pitch.total_reaction_count >= threshold,
          })
          .eq('id', rp.id);
        if (updateError) {
          console.error(`Failed to update pitch ${rp.id}:`, updateError.message);
        }
      }
    }

    // Mark prompt as processed
    await supabase
      .from('prompts')
      .update({ is_closed_processed: true })
      .eq('id', prompt.id);

    processed++;
  }

  return NextResponse.json({ processed });
}
