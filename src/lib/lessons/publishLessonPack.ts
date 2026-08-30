/**
 * Call publish-lesson-pack with the signed-in user JWT.
 * Never uses the service role. Does not assign or flip published.
 */

import { supabaseAnonKey, supabaseUrl } from '@/constants/config';
import { requireSupabase } from '@/lib/supabase/client';

export type PublishLessonPackFile = {
  path: string;
  bytes: Blob | ArrayBuffer | Uint8Array;
};

export type PublishLessonPackInput = {
  deckId: string;
  version: string;
  storageDeckId: string;
  title: string;
  beatStart: string;
  beatEnd: string;
  kind?: 'lesson';
  files: PublishLessonPackFile[];
  /** Office only. Teachers cannot replace live FoM or slice a shared folder. */
  replaceLive?: boolean;
};

export type PublishLessonPackResult = {
  ok: true;
  deck_id: string;
  version: string;
  storage_deck_id: string;
  beat_start: string;
  beat_end: string;
  title: string;
  published: false;
  bytes: number;
};

function asBlob(bytes: Blob | ArrayBuffer | Uint8Array): Blob {
  if (bytes instanceof Blob) return bytes;
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return new Blob([copy.buffer]);
}

/** Upload a pack as unpublished. Caller assigns afterward through the normal assign path. */
export async function publishLessonPack(input: PublishLessonPackInput): Promise<PublishLessonPackResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase is not configured.');
  }
  const supabase = requireSupabase();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionError || !token) throw new Error('sign in first');

  const form = new FormData();
  form.set('deck_id', input.deckId);
  form.set('version', input.version);
  form.set('storage_deck_id', input.storageDeckId);
  form.set('title', input.title);
  form.set('beat_start', input.beatStart);
  form.set('beat_end', input.beatEnd);
  form.set('kind', input.kind ?? 'lesson');
  if (input.replaceLive) form.set('replace_live', 'true');
  for (const file of input.files) {
    const path = file.path.replace(/^\/+/, '');
    // Field name carries the object path (some runtimes strip directories from filename).
    form.append(path, asBlob(file.bytes), path);
  }

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/publish-lesson-pack`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: form,
  });
  const payload = (await res.json().catch(() => null)) as
    | (PublishLessonPackResult & { error?: string })
    | { error?: string }
    | null;
  if (!res.ok) {
    throw new Error((payload && 'error' in payload && payload.error) || `publish failed (${res.status})`);
  }
  if (!payload || !('ok' in payload) || payload.ok !== true || payload.published !== false) {
    throw new Error('publish failed');
  }
  return payload;
}
