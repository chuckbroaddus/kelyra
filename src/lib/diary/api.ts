import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DIARY_PRIVACY_ACK_KEY_PREFIX,
  diaryPrivacyAckKey,
} from '@/lib/diary/privacy';
import type { DiarySeat } from '@/lib/diary/seat';
import type { DiaryDraft, DiaryEntryRow, DiaryMediaRow, LedgerEventRow } from '@/lib/diary/types';
import { readUriAsBytes } from '@/lib/media/upload';
import { signedUrl } from '@/lib/media/signedUrl';
import { requireSupabase } from '@/lib/supabase/client';

/** Untyped until Database types regenerate after CoS applies migration. */
function diaryDb(): any {
  return requireSupabase();
}

export type ListDiaryInput = {
  seat: DiarySeat;
  childStudentId?: string | null;
  query?: string | null;
  from?: string | null;
  to?: string | null;
  tag?: string | null;
  studentId?: string | null;
  limit?: number;
};

export async function listDiaryEntries(input: ListDiaryInput): Promise<DiaryEntryRow[]> {
  const { data, error } = await diaryDb().rpc('list_my_diary_entries', {
    p_seat: input.seat,
    p_child_student_id: input.childStudentId ?? null,
    p_query: input.query?.trim() || null,
    p_from: input.from ?? null,
    p_to: input.to ?? null,
    p_tag: input.tag ?? null,
    p_student_id: input.studentId ?? null,
    p_limit: input.limit ?? 200,
  });
  if (error) throw error;
  return (data ?? []) as DiaryEntryRow[];
}

export async function getDiaryEntry(entryId: string): Promise<DiaryEntryRow | null> {
  const { data, error } = await diaryDb()
    .from('diary_entries')
    .select('*')
    .eq('id', entryId)
    .maybeSingle();
  if (error) throw error;
  return data as DiaryEntryRow | null;
}

export async function createDiaryEntry(input: {
  ownerProfileId: string;
  seat: DiarySeat;
  body: string;
  title?: string | null;
  entryDate?: string | null;
  tags?: string[];
  studentId?: string | null;
  childStudentId?: string | null;
}): Promise<DiaryEntryRow> {
  const body = input.body.trim();
  if (!body) throw new Error('Write something before saving.');
  const row = {
    owner_profile_id: input.ownerProfileId,
    seat: input.seat,
    body,
    title: input.title?.trim() || null,
    entry_date: input.entryDate || new Date().toISOString().slice(0, 10),
    tags: input.tags ?? [],
    student_id: input.studentId ?? null,
    child_student_id: input.childStudentId ?? null,
  };
  const { data, error } = await diaryDb().from('diary_entries').insert(row).select('*').single();
  if (error) throw error;
  return data as DiaryEntryRow;
}

export async function updateDiaryEntry(
  entryId: string,
  input: {
    body: string;
    title?: string | null;
    entryDate?: string | null;
    tags?: string[];
    studentId?: string | null;
    childStudentId?: string | null;
  },
): Promise<DiaryEntryRow> {
  const body = input.body.trim();
  if (!body) throw new Error('Write something before saving.');
  const { data, error } = await diaryDb()
    .from('diary_entries')
    .update({
      body,
      title: input.title?.trim() || null,
      entry_date: input.entryDate || undefined,
      tags: input.tags ?? [],
      student_id: input.studentId ?? null,
      child_student_id: input.childStudentId ?? null,
    })
    .eq('id', entryId)
    .select('*')
    .single();
  if (error) throw error;
  return data as DiaryEntryRow;
}

export async function deleteDiaryEntry(entryId: string): Promise<void> {
  const media = await listDiaryMedia(entryId);
  const { error } = await diaryDb().from('diary_entries').delete().eq('id', entryId);
  if (error) throw error;
  // Best-effort object GC (trigger also deletes by path)
  for (const row of media) {
    try {
      await diaryDb().storage.from('diary').remove([row.storage_path]);
    } catch {
      // ignore
    }
  }
}

export async function listDiaryMedia(entryId: string): Promise<DiaryMediaRow[]> {
  const { data, error } = await diaryDb()
    .from('diary_media')
    .select('*')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DiaryMediaRow[];
}

export async function attachDiaryPhoto(input: {
  ownerProfileId: string;
  seat: DiarySeat;
  entryId: string;
  uri: string;
  mimeType: string;
}): Promise<DiaryMediaRow> {
  const mediaId = cryptoRandomId();
  const ext = input.mimeType.includes('png') ? 'png' : 'jpg';
  const storagePath = `${input.ownerProfileId}/${input.seat}/${input.entryId}/${mediaId}.${ext}`;
  const bytes = new Uint8Array(await readUriAsBytes(input.uri));
  if (!bytes.byteLength) throw new Error('That photo was empty.');
  const { error: upError } = await diaryDb().storage.from('diary').upload(storagePath, bytes, {
    contentType: input.mimeType || 'image/jpeg',
    upsert: false,
  });
  if (upError) throw upError;
  const { data, error } = await diaryDb()
    .from('diary_media')
    .insert({
      id: mediaId,
      entry_id: input.entryId,
      owner_profile_id: input.ownerProfileId,
      kind: 'photo',
      storage_path: storagePath,
      content_type: input.mimeType || 'image/jpeg',
      byte_size: bytes.byteLength,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DiaryMediaRow;
}

export async function diaryMediaSignedUrl(storagePath: string): Promise<string | null> {
  return signedUrl('diary', storagePath);
}

export async function listLedgerEvents(input: {
  seat: DiarySeat;
  actionFamily?: string | null;
  classId?: string | null;
  studentId?: string | null;
  query?: string | null;
  fromIso?: string | null;
  toIso?: string | null;
  ascending?: boolean;
  limit?: number;
}): Promise<LedgerEventRow[]> {
  let q = diaryDb()
    .from('ledger_events')
    .select('*')
    .eq('seat', input.seat)
    .order('created_at', { ascending: Boolean(input.ascending) })
    .limit(input.limit ?? 300);
  if (input.actionFamily) q = q.eq('action_family', input.actionFamily);
  if (input.classId) q = q.eq('class_id', input.classId);
  if (input.studentId) q = q.eq('student_id', input.studentId);
  if (input.fromIso) q = q.gte('created_at', input.fromIso);
  if (input.toIso) q = q.lte('created_at', input.toIso);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as LedgerEventRow[];
  const needle = input.query?.trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter((row) => row.summary.toLowerCase().includes(needle));
}

export async function listParentLinkedChildren(): Promise<Array<{ id: string; display_name: string }>> {
  const supabase = diaryDb();
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return [];
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('parent_id')
    .eq('id', uid)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.parent_id) return [];
  const { data: links, error: linkError } = await supabase
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', profile.parent_id);
  if (linkError) throw linkError;
  const ids = [...new Set((links ?? []).map((row: { student_id: string }) => row.student_id).filter(Boolean))];
  if (!ids.length) return [];
  const { data: kids, error: kidsError } = await supabase
    .from('students')
    .select('id, display_name')
    .in('id', ids)
    .order('display_name');
  if (kidsError) throw kidsError;
  return (kids ?? []) as Array<{ id: string; display_name: string }>;
}

export async function hasAckedDiaryPrivacy(profileId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(diaryPrivacyAckKey(profileId))) === '1';
  } catch {
    return false;
  }
}

export async function ackDiaryPrivacy(profileId: string): Promise<void> {
  await AsyncStorage.setItem(diaryPrivacyAckKey(profileId), '1');
}

export function parkDiaryDraft(draft: DiaryDraft): DiaryDraft {
  return {
    title: draft.title?.trim() || null,
    body: String(draft.body ?? '').trim(),
    entry_date: draft.entry_date || new Date().toISOString().slice(0, 10),
  };
}

function cryptoRandomId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export { DIARY_PRIVACY_ACK_KEY_PREFIX };

const PENDING_DRAFT_PREFIX = 'kelyra.diary.pendingDraft.';

export async function parkPendingDiaryDraft(profileId: string, draft: DiaryDraft): Promise<void> {
  await AsyncStorage.setItem(`${PENDING_DRAFT_PREFIX}${profileId}`, JSON.stringify(parkDiaryDraft(draft)));
}

export async function takePendingDiaryDraft(profileId: string): Promise<DiaryDraft | null> {
  const key = `${PENDING_DRAFT_PREFIX}${profileId}`;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    await AsyncStorage.removeItem(key);
    const parsed = JSON.parse(raw) as DiaryDraft;
    if (!parsed?.body) return null;
    return parkDiaryDraft(parsed);
  } catch {
    return null;
  }
}
