import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from '@/lib/api-error';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: prompt, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !prompt) return notFound('Topic not found');

  // Anonymize creator on open prompts (unless viewing own)
  const isOpen = new Date(prompt.closes_at) > new Date();
  if (isOpen && prompt.created_by !== user?.id) {
    prompt.created_by = null;
  }

  return NextResponse.json(prompt);
}
