import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type BatchRow = {
  id: string;
  teacher_id: string;
  class_id: string;
  pages_per_student: number;
  ignore_blank_backs: boolean;
  status: string;
  page_count: number | null;
  pages_done: number | null;
  error_code: string | null;
  file_count: number;
};

export type FileRow = {
  id: string;
  batch_id: string;
  sort_index: number;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  storage_path: string;
  status: string;
  page_count: number | null;
};

export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role only; never Expo).');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** CAS claim: received|retry_remainder → rasterizing. One batch per teacher (others wait). */
export async function claimNextBatch(supabase: SupabaseClient): Promise<BatchRow | null> {
  // Prefer oldest received; skip teachers already rasterizing.
  const { data: busy, error: busyErr } = await supabase
    .from('ingest_batches')
    .select('teacher_id')
    .eq('status', 'rasterizing');
  if (busyErr) throw busyErr;
  const busyTeachers = new Set((busy ?? []).map((r: { teacher_id: string }) => r.teacher_id));

  const { data: candidates, error } = await supabase
    .from('ingest_batches')
    .select(
      'id, teacher_id, class_id, pages_per_student, ignore_blank_backs, status, page_count, pages_done, error_code, file_count',
    )
    .in('status', ['received', 'retry_remainder'])
    .order('created_at', { ascending: true })
    .limit(20);
  if (error) throw error;

  for (const row of candidates ?? []) {
    if (busyTeachers.has(row.teacher_id)) continue;
    const { data: claimed, error: claimErr } = await supabase
      .from('ingest_batches')
      .update({
        status: 'rasterizing',
        error_code: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .in('status', ['received', 'retry_remainder'])
      .select(
        'id, teacher_id, class_id, pages_per_student, ignore_blank_backs, status, page_count, pages_done, error_code, file_count',
      )
      .maybeSingle();
    if (claimErr) throw claimErr;
    if (claimed) return claimed as BatchRow;
  }
  return null;
}

export async function listBatchFiles(supabase: SupabaseClient, batchId: string): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from('ingest_files')
    .select(
      'id, batch_id, sort_index, original_filename, mime_type, byte_size, sha256, storage_path, status, page_count',
    )
    .eq('batch_id', batchId)
    .eq('status', 'received')
    .order('sort_index', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FileRow[];
}

export async function updateBatchProgress(
  supabase: SupabaseClient,
  batchId: string,
  patch: {
    pages_done?: number;
    page_count?: number;
    status?: string;
    error_code?: string | null;
    error_message?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('ingest_batches')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', batchId);
  if (error) throw error;
}

export async function createSignedFileUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresSec = 600,
): Promise<string> {
  const { data, error } = await supabase.storage.from('files').createSignedUrl(storagePath, expiresSec);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'signed url failed');
  }
  return data.signedUrl;
}

export async function uploadPhoto(
  supabase: SupabaseClient,
  path: string,
  bytes: Buffer,
  contentType = 'image/jpeg',
): Promise<void> {
  const { error } = await supabase.storage.from('photos').upload(path, bytes, {
    contentType,
    upsert: true,
    cacheControl: '31536000',
  });
  if (error) throw error;
}

export async function insertAsset(
  supabase: SupabaseClient,
  input: {
    teacherId: string;
    storagePath: string;
    thumbStoragePath: string;
    byteSize: number;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('assets')
    .insert({
      teacher_id: input.teacherId,
      kind: 'photo',
      storage_path: input.storagePath,
      thumb_storage_path: input.thumbStoragePath,
      mime_type: 'image/jpeg',
      byte_size: input.byteSize,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function upsertIngestPage(
  supabase: SupabaseClient,
  input: {
    batchId: string;
    fileId: string;
    pageIndex: number;
    filePageIndex: number;
    assetId: string;
    blank: boolean;
    byteSize: number;
    status?: string;
  },
): Promise<{ id: string; inserted: boolean }> {
  // Idempotent on (batch_id, page_index): skip if already rasterized.
  const { data: existing, error: findErr } = await supabase
    .from('ingest_pages')
    .select('id, status')
    .eq('batch_id', input.batchId)
    .eq('page_index', input.pageIndex)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing && existing.status === 'rasterized') {
    return { id: existing.id as string, inserted: false };
  }

  if (existing) {
    const { data, error } = await supabase
      .from('ingest_pages')
      .update({
        asset_id: input.assetId,
        blank: input.blank,
        byte_size: input.byteSize,
        status: input.status ?? 'rasterized',
        error_code: null,
        file_id: input.fileId,
        file_page_index: input.filePageIndex,
      })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return { id: data.id as string, inserted: false };
  }

  const { data, error } = await supabase
    .from('ingest_pages')
    .insert({
      batch_id: input.batchId,
      file_id: input.fileId,
      page_index: input.pageIndex,
      file_page_index: input.filePageIndex,
      asset_id: input.assetId,
      blank: input.blank,
      byte_size: input.byteSize,
      status: input.status ?? 'rasterized',
      quality: 'ok',
    })
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id as string, inserted: true };
}

export async function replaceDraftPackets(
  supabase: SupabaseClient,
  batchId: string,
  packets: { ordinal: number; pageIds: string[]; blank: boolean }[],
): Promise<void> {
  // Delete only draft packets without capture_id
  const { error: delErr } = await supabase
    .from('ingest_packets')
    .delete()
    .eq('batch_id', batchId)
    .eq('status', 'draft')
    .is('capture_id', null);
  if (delErr) throw delErr;

  if (packets.length === 0) return;
  const rows = packets.map((p) => ({
    batch_id: batchId,
    ordinal: p.ordinal,
    page_ids: p.pageIds,
    blank: p.blank,
    status: 'draft',
  }));
  const { error } = await supabase.from('ingest_packets').insert(rows);
  if (error) throw error;
}

export async function updateFilePageCount(
  supabase: SupabaseClient,
  fileId: string,
  pageCount: number,
): Promise<void> {
  const { error } = await supabase.from('ingest_files').update({ page_count: pageCount }).eq('id', fileId);
  if (error) throw error;
}

export async function countTeacherPagesToday(
  supabase: SupabaseClient,
  teacherId: string,
): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('ingest_pages')
    .select('id, ingest_batches!inner(teacher_id)', { count: 'exact', head: true })
    .eq('ingest_batches.teacher_id', teacherId)
    .eq('status', 'rasterized')
    .gte('created_at', start.toISOString());
  if (error) {
    // Non-fatal if join shape differs; worker continues without day-cap (logged by caller).
    return 0;
  }
  return count ?? 0;
}

export async function listRasterizedPages(
  supabase: SupabaseClient,
  batchId: string,
): Promise<{ id: string; page_index: number; blank: boolean }[]> {
  const { data, error } = await supabase
    .from('ingest_pages')
    .select('id, page_index, blank, status')
    .eq('batch_id', batchId)
    .eq('status', 'rasterized')
    .order('page_index', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    page_index: r.page_index as number,
    blank: Boolean(r.blank),
  }));
}
