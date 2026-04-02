import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generatePrompts } from '@/lib/ai/prompt-generator';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Idempotency: check if today's system prompts already exist
  // 9 AM EST = 14:00 UTC
  const now = new Date();
  const todayEST = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const year = todayEST.getFullYear();
  const month = String(todayEST.getMonth() + 1).padStart(2, '0');
  const day = String(todayEST.getDate()).padStart(2, '0');

  // opens_at for today: 9 AM EST
  const opensAt = new Date(`${year}-${month}-${day}T09:00:00-05:00`);
  const closesAt = new Date(`${year}-${month}-${day}T18:00:00-05:00`);

  // Check if we already generated for today
  const { count } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('is_system_generated', true)
    .gte('opens_at', opensAt.toISOString())
    .lt('opens_at', new Date(opensAt.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if ((count ?? 0) > 0) {
    return NextResponse.json({ message: 'Already generated for today', count });
  }

  // Generate prompts
  const generated = await generatePrompts();

  // Insert all 5 prompts
  const { error } = await supabase.from('prompts').insert(
    generated.map((p) => ({
      body: p.body,
      prompt_type: p.prompt_type,
      is_system_generated: true,
      created_by: null,
      opens_at: opensAt.toISOString(),
      closes_at: closesAt.toISOString(),
    }))
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ generated: generated.length });
}
