import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { isSupabaseConfigured } from '@/constants/config';
import { loadTeacherProfile, getSession, signOut as signOutRequest } from '@/lib/auth/api';
import { bindSignedUrlCacheUser, clearSignedUrlCache } from '@/lib/media/signedUrl';
import { loadMyProfile } from '@/lib/school/api';
import { loadGrants } from '@/lib/school/matrixApi';
import { grantsFromCapabilities, type GrantMap } from '@/lib/school/matrix';
import { shouldLoadTeacherRow } from '@/lib/school/roles';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ProfileRow, TeacherRow } from '@/lib/supabase/types';
import { unlockAppOrientation } from '@/lib/theme/screenOrientation';

type AuthState = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  teacher: TeacherRow | null;
  profile: ProfileRow | null;
  /** Capability matrix grants (30s cache via loadGrants). UI chrome gates pass these into can(). */
  grants: GrantMap;
  error: string | null;
  refresh: () => Promise<void>;
  refreshTeacher: () => Promise<void>;
  /** Update in-memory teacher.active_class_id after a DB write (Q15). */
  setActiveClassId: (classId: string | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [session, setSession] = useState<Session | null>(null);
  const [teacher, setTeacher] = useState<TeacherRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [grants, setGrants] = useState<GrantMap>(() => grantsFromCapabilities());
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
      if (!next) {
        await clearSignedUrlCache();
        setTeacher(null);
        setProfile(null);
      } else {
        await bindSignedUrlCacheUser(next.user.id);
        const mine = await loadMyProfile().catch(() => null);
        setProfile(mine);
        setGrants(await loadGrants().catch(() => grantsFromCapabilities()));
        // Fail closed: missing / student / parent must not load or mint a teachers row.
        if (shouldLoadTeacherRow(mine)) setTeacher(await loadTeacherProfile());
        else setTeacher(null);
      }
    } catch (err) {
      setSession(null);
      setTeacher(null);
      setGrants(grantsFromCapabilities());
      setError(err instanceof Error ? err.message : 'Could not load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Clear / rebind on any non-explicit session end (SIGNED_OUT, null refresh), not only signOut().
      if (event === 'SIGNED_OUT' || !nextSession) {
        void clearSignedUrlCache();
      } else {
        void bindSignedUrlCacheUser(nextSession.user.id);
      }
      void refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [configured]);

  // Post-auth: restore default orientation (pre-auth splash locks portrait on phones).
  useEffect(() => {
    if (!session) return;
    void unlockAppOrientation();
  }, [session]);

  const refreshTeacher = async () => {
    if (!configured) return;
    try {
      const next = await getSession();
      if (!next) {
        setTeacher(null);
        setProfile(null);
        setGrants(grantsFromCapabilities());
        return;
      }
      const mine = await loadMyProfile().catch(() => null);
      setProfile(mine);
      setGrants(await loadGrants().catch(() => grantsFromCapabilities()));
      if (shouldLoadTeacherRow(mine)) setTeacher(await loadTeacherProfile());
      else setTeacher(null);
    } catch {
      // Keep the current teacher row if a silent refresh fails.
    }
  };

  const setActiveClassId = (classId: string | null) => {
    setTeacher((current) => (current ? { ...current, active_class_id: classId } : current));
  };

  const value = useMemo<AuthState>(
    () => ({
      configured,
      loading,
      session,
      teacher,
      profile,
      grants,
      error,
      refresh,
      refreshTeacher,
      setActiveClassId,
      signOut: async () => {
        await signOutRequest();
        await clearSignedUrlCache();
        setSession(null);
        setTeacher(null);
        setProfile(null);
        setGrants(grantsFromCapabilities());
      },
    }),
    [configured, loading, session, teacher, profile, grants, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
