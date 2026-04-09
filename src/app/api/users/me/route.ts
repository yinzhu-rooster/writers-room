import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { badRequest, unauthorized, serverError, safeJson } from '@/lib/api-error';
import { z } from 'zod';
import { usernameSchema } from '@/lib/validators/username';

const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  avatar_url: z.string().url().refine(u => {
    if (!u.startsWith('https://')) return false;
    const host = new URL(u).hostname;
    return [
      'lh3.googleusercontent.com',
      'avatars.githubusercontent.com',
    ].some(allowed => host === allowed || host.endsWith('.supabase.co'));
  }, { message: 'Avatar URL must be from Google, GitHub, or Supabase' }).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await safeJson(request);
  if (body instanceof NextResponse) return body;
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0].message);

  const updates: Record<string, unknown> = {};
  if (parsed.data.username !== undefined) updates.username = parsed.data.username;
  if (parsed.data.avatar_url !== undefined) updates.avatar_url = parsed.data.avatar_url;

  if (Object.keys(updates).length === 0) {
    return badRequest('No fields to update');
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return badRequest('Username already taken');
    return serverError('Failed to update profile');
  }

  return NextResponse.json(data);
}
