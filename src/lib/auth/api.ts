import { handleFromInput } from '@/lib/school/roles';
import { requireSupabase } from '@/lib/supabase/client';
import type { TeacherRow } from '@/lib/supabase/types';

export async function signInWithPassword(handle: string, password: string) {
  const raw = handle.trim();
  const looksLikeEmail = raw.includes('@') && raw.includes('.');
  const supabase = requireSupabase();

  if (looksLikeEmail) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: raw,
      password,
    });
    if (error) throw error;
    return data;
  }

  // Handle path: Edge resolves username→email with service_role and never returns it.
  const { data, error } = await supabase.functions.invoke('sign-in-handle', {
    body: { handle: handleFromInput(raw), password },
  });
  const payload = (data ?? null) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  } | null;
  if (error || !payload?.access_token || !payload?.refresh_token) {
    throw new Error(
      (payload && typeof payload.error === 'string' && payload.error) ||
        'Could not sign in with that username and password.',
    );
  }
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });
  if (sessionError) throw sessionError;
  return sessionData;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  try {
    const { clearSignedUrlCache } = await import('@/lib/media/signedUrl');
    await clearSignedUrlCache();
    const { clearStudentSessionCache } = await import('@/lib/student-session/api');
    clearStudentSessionCache();
    const { clearFeedCache } = await import('@/lib/posts/api');
    clearFeedCache();
  } catch {
    // Session is already gone.
  }
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error) throw error;
  return data.session;
}

/**
 * Load an existing teachers row for the signed-in user.
 * Never inserts or upserts — office provision / claim / hats create staff rows.
 * Callers must gate on shouldLoadTeacherRow so students/parents never hit this.
 */
export async function ensureTeacherProfile(): Promise<TeacherRow | null> {
  const supabase = requireSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  const { data: existing, error: selectError } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (selectError) throw selectError;
  return existing;
}
