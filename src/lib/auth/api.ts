import { lookupLoginEmail } from '@/lib/school/api';
import { requireSupabase } from '@/lib/supabase/client';
import type { TeacherRow } from '@/lib/supabase/types';

export async function signInWithPassword(handle: string, password: string) {
  const raw = handle.trim();
  const looksLikeEmail = raw.includes('@') && raw.includes('.');
  const email = looksLikeEmail ? raw : await lookupLoginEmail(raw);
  if (!email) {
    throw new Error('No login for that @handle. Check the exact username on People.');
  }
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
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

export async function ensureTeacherProfile(): Promise<TeacherRow> {
  const supabase = requireSupabase();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user?.email) throw new Error('Not signed in');

  const { data: existing, error: selectError } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing;

  const { data: inserted, error: insertError } = await supabase
    .from('teachers')
    .insert({ id: user.id, email: user.email })
    .select('*')
    .single();
  if (insertError) throw insertError;
  return inserted;
}
