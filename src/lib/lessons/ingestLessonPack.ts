/**
 * Call ingest-lesson-pack with the signed-in user JWT.
 * Returns a JSON pack draft only. Never uses the service role.
 * Does not write Storage, upsert lesson_packs, assign, or publish.
 */

import { supabaseAnonKey, supabaseUrl } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase/client';

export type IngestLessonPackImage = {
  mime?: string;
  dataBase64: string;
};

export type IngestLessonPackInput = {
  /** Extracted PPT slide text (preferred). Raw .pptx is not accepted. */
  text?: string;
  images?: IngestLessonPackImage[];
};

export type IngestLessonPackResult = {
  ok: true;
  pack: Record<string, unknown>;
};

/** Ask Gemini (via Edge) for a FoM 1.2 author-test pack JSON draft. */
export async function ingestLessonPack(
  input: IngestLessonPackInput,
): Promise<IngestLessonPackResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured.');
  }
  const supabase = requireSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error('sign in first');

  const body: Record<string, unknown> = {};
  if (input.text?.trim()) body.text = input.text.trim();
  if (input.images?.length) {
    body.images = input.images.map((image) => ({
      mime: image.mime ?? 'image/jpeg',
      data_base64: image.dataBase64,
    }));
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/ingest-lesson-pack`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as
    | (IngestLessonPackResult & { error?: string })
    | { error?: string }
    | null;
  if (!res.ok) {
    throw new Error((payload && 'error' in payload && payload.error) || `ingest failed (${res.status})`);
  }
  if (!payload || !('ok' in payload) || payload.ok !== true || !payload.pack) {
    throw new Error('ingest failed');
  }
  return payload;
}
