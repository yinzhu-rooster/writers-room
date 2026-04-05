'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/types/database';
import type { User as AuthUser } from '@supabase/supabase-js';

interface UserContextValue {
  authUser: AuthUser | null;
  profile: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextValue>({
  authUser: null,
  profile: null,
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      setLoading(false);
      return;
    }

    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      const user = data?.user ?? null;

      if (error || !user) {
        // Clear stale cookies so middleware stops thinking we're authed
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        return;
      }

      setAuthUser(user);

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      } else {
        // Auth user exists but no profile row — clear session
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setAuthUser(null);
      }
    }

    loadUser().finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profileError) {
            console.error('Failed to load profile on auth change:', profileError.message);
          }
          setProfile(data);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext value={{ authUser, profile, loading }}>
      {children}
    </UserContext>
  );
}

export function useUser() {
  return useContext(UserContext);
}
