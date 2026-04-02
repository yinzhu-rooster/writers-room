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
    const supabase = createClient();

    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setAuthUser(user);

        if (user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          setProfile(data);
        }
      } catch {
        // Auth check failed — treat as logged out
      }
      setLoading(false);
    }

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
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
