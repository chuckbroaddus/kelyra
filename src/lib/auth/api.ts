import { requireSupabase } from '@/lib/supabase/client';
import type { TeacherRow } from '@/lib/supabase/types';

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim(),
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
