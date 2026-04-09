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

  // Find unprocessed closed prompts (batch to avoid timeout on backlog)
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id')
    .lte('closes_at', now)
    .eq('is_closed_processed', false)
    .limit(50);

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
      const pitchMap = new Map(pitches.map(p => [p.id, p]));

      // Batch update pitches with rank and reveal status
      const updates = ranked.map((rp) => {
        const pitch = pitchMap.get(rp.id);
        return {
          id: rp.id,
          rank: rp.rank,
          is_revealed: (pitch?.total_reaction_count ?? 0) >= threshold,
        };
      });

      // Use Promise.all for parallel updates (Supabase doesn't support batch upsert on different values per row)
      const results = await Promise.all(
        updates.map(u =>
          supabase.from('pitches').update({ rank: u.rank, is_revealed: u.is_revealed }).eq('id', u.id)
        )
      );
      const hasUpdateError = results.some(({ error: updateError }) => {
        if (updateError) console.error('Failed to update pitch:', updateError.message);
        return !!updateError;
      });

      // Only mark as processed if all pitch updates succeeded
      if (hasUpdateError) continue;
    }

    // Mark prompt as processed
    const { error: markError } = await supabase
      .from('prompts')
      .update({ is_closed_processed: true })
      .eq('id', prompt.id);
    if (markError) {
      console.error(`Failed to mark prompt ${prompt.id} as processed:`, markError.message);
      continue;
    }

    processed++;
  }

  return NextResponse.json({ processed });
}
