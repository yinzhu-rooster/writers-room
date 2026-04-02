import { createClient } from '@/lib/supabase/server';

/**
 * @deprecated Use getUser() instead — getSession() reads from the local
 * cookie without server-side verification and can be spoofed with a forged JWT.
 */
export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Return a minimal session-like object backed by verified getUser()
  if (!user) return null;
  return { user };
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
