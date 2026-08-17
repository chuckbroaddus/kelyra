import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/constants/config';
import { ensureTeacherProfile, getSession, signOut as signOutRequest } from '@/lib/auth/api';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { TeacherRow } from '@/lib/supabase/types';

type AuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  teacher: TeacherRow | null;
  error: string | null;
  refresh: () => Promise<void>;
  refreshTeacher: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await getSession();
      setSession(next);
      setTeacher(next ? await ensureTeacherProfile() : null);
    } catch (err) {
      setSession(null);
      setTeacher(null);
      setError(err instanceof Error ? err.message : 'Could not load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [configured]);

  const refreshTeacher = async () => {
    if (!configured) return;
    try {
      const next = await getSession();
      setTeacher(next ? await ensureTeacherProfile() : null);
    } catch {
      // Keep the current teacher row if a silent refresh fails.
    }
  };

  const value = useMemo<AuthState>(
    () => ({
      configured,
      loading,
      session,
      teacher,
      error,
      refresh,
      refreshTeacher,
      signOut: async () => {
        await signOutRequest();
        setSession(null);
        setTeacher(null);
      },
    }),
    [configured, loading, session, teacher, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
