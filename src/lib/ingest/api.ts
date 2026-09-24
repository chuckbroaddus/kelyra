import { loadPhotoAssetPaths } from '@/lib/media/upload';
import { signedThumbUrls } from '@/lib/media/signedUrl';
import { requireSupabase } from '@/lib/supabase/client';
import {
  enqueueExclusive,
  shouldRollbackSplitPersist,
} from '@/lib/ingest/saveQueue';
import {
  planSaveIngestSplit,
  type SplitPacketDraft,
} from '@/lib/ingest/splitPackets';

export type IngestBatchRow = {
  id: string;
  teacher_id: string;
  class_id: string;
  assignment_id: string | null;
  pages_per_student: number;
  ignore_blank_backs: boolean;
  status: string;
  bytes_total: number;
  file_count: number;
  page_count: number | null;
  pages_done?: number | null;
  error_code: string | null;
  error_message: string | null;
  split_draft_version?: number;
  roster_count?: number | null;
  teacher_confirmed_split?: boolean;
  created_at: string;
};

export type IngestFileRow = {
  id: string;
  batch_id: string;
  sort_index: number;
  original_filename: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  storage_path: string;
  tus_upload_id: string | null;
  status: string;
  error_code: string | null;
};

export type IngestPageRow = {
  id: string;
  batch_id: string;
  file_id: string;
  page_index: number;
  file_page_index: number;
  asset_id: string | null;
  blank: boolean;
  quality: string | null;
  status: string;
  error_code: string | null;
  byte_size: number | null;
  thumbUrl?: string | null;
};

export type IngestPacketRow = {
  id: string;
  batch_id: string;
  ordinal: number;
  page_ids: string[];
  blank: boolean;
  capture_id: string | null;
  status: string;
  error_code: string | null;
};

export type IngestSplitReviewPayload = {
  batch: IngestBatchRow;
  pages: IngestPageRow[];
  packets: IngestPacketRow[];
  rosterCount: number;
};

export async function createIngestBatch(input: {
  classId: string;
  assignmentId?: string | null;
  pagesPerStudent?: number;
}): Promise<IngestBatchRow> {
  const { data, error } = await requireSupabase().rpc('create_ingest_batch', {
    p_class_id: input.classId,
    p_assignment_id: input.assignmentId ?? null,
    p_pages_per_student: input.pagesPerStudent ?? 1,
  });
  if (error) throw mapRpcError(error);
  return data as IngestBatchRow;
}

export async function registerIngestFile(input: {
  batchId: string;
  sortIndex: number;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256: string;
  storagePath: string;
  tusUploadId?: string | null;
}): Promise<IngestFileRow> {
  const { data, error } = await requireSupabase().rpc('register_ingest_file', {
    p_batch_id: input.batchId,
    p_sort_index: input.sortIndex,
    p_original_filename: input.originalFilename,
    p_mime_type: input.mimeType,
    p_byte_size: input.byteSize,
    p_sha256: input.sha256,
    p_storage_path: input.storagePath,
    p_tus_upload_id: input.tusUploadId ?? null,
  });
  if (error) throw mapRpcError(error);
  return data as IngestFileRow;
}

export async function ingestMarkReceived(batchId: string): Promise<IngestBatchRow> {
  const { data, error } = await requireSupabase().rpc('ingest_mark_received', {
    p_batch_id: batchId,
  });
  if (error) throw mapRpcError(error);
  return data as IngestBatchRow;
}

export async function abandonIngestBatch(batchId: string): Promise<IngestBatchRow> {
  const { data, error } = await requireSupabase().rpc('abandon_ingest_batch', {
    p_batch_id: batchId,
  });
  if (error) throw mapRpcError(error);
  return data as IngestBatchRow;
}

/** I5: partial → retry_remainder so the worker resumes skipped rasterized indexes. */
export async function retryIngestRemainder(batchId: string): Promise<IngestBatchRow> {
  const { data, error } = await requireSupabase().rpc('retry_ingest_remainder', {
    p_batch_id: batchId,
  });
  if (error) throw mapRpcError(error);
  return data as IngestBatchRow;
}

export async function fetchIngestBatch(batchId: string): Promise<IngestBatchRow> {
  const { data, error } = await requireSupabase()
    .from('ingest_batches')
    .select(
      'id, teacher_id, class_id, assignment_id, pages_per_student, ignore_blank_backs, status, bytes_total, file_count, page_count, pages_done, error_code, error_message, split_draft_version, roster_count, teacher_confirmed_split, created_at',
    )
    .eq('id', batchId)
    .single();
  if (error) throw mapRpcError(error);
  return data as IngestBatchRow;
}

/**
 * I5: resume handle for open stacks (partial / retry / in-flight / split_review).
 * RLS creator wall + class_teacher_of. Newest first.
 */
export async function fetchOpenIngestBatchForClass(
  classId: string,
): Promise<IngestBatchRow | null> {
  const { data, error } = await requireSupabase()
    .from('ingest_batches')
    .select(
      'id, teacher_id, class_id, assignment_id, pages_per_student, ignore_blank_backs, status, bytes_total, file_count, page_count, pages_done, error_code, error_message, split_draft_version, roster_count, teacher_confirmed_split, created_at',
    )
    .eq('class_id', classId)
    .in('status', [
      'partial',
      'retry_remainder',
      'rasterizing',
      'received',
      'receiving',
      'split_review',
    ])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw mapRpcError(error);
  return (data as IngestBatchRow | null) ?? null;
}

export async function countClassRoster(classId: string): Promise<number> {
  const { count, error } = await requireSupabase()
    .from('enrollments')
    .select('student_id', { count: 'exact', head: true })
    .eq('class_id', classId);
  if (error) throw mapRpcError(error);
  return count ?? 0;
}

/** Load batch + page thumbs (signed page assets only — never original PDF) + packets. */
export async function fetchIngestSplitReview(batchId: string): Promise<IngestSplitReviewPayload> {
  const batch = await fetchIngestBatch(batchId);
  const supabase = requireSupabase();

  const [{ data: pageRows, error: pageErr }, { data: packetRows, error: packetErr }, rosterCount] =
    await Promise.all([
      supabase
        .from('ingest_pages')
        .select(
          'id, batch_id, file_id, page_index, file_page_index, asset_id, blank, quality, status, error_code, byte_size',
        )
        .eq('batch_id', batchId)
        .order('page_index', { ascending: true }),
      supabase
        .from('ingest_packets')
        .select('id, batch_id, ordinal, page_ids, blank, capture_id, status, error_code')
        .eq('batch_id', batchId)
        .order('ordinal', { ascending: true }),
      countClassRoster(batch.class_id),
    ]);

  if (pageErr) throw mapRpcError(pageErr);
  if (packetErr) throw mapRpcError(packetErr);

  const pages = (pageRows ?? []) as IngestPageRow[];
  const packets = (packetRows ?? []).map((row) => ({
    ...(row as IngestPacketRow),
    page_ids: Array.isArray((row as IngestPacketRow).page_ids)
      ? (row as IngestPacketRow).page_ids
      : [],
  }));

  const assetIds = pages.map((p) => p.asset_id).filter((id): id is string => Boolean(id));
  const assets = await loadPhotoAssetPaths(assetIds);
  const byId = new Map(assets.map((a) => [a.id, a]));
  const originals: string[] = [];
  const knownThumbs = new Map<string, string | null | undefined>();
  for (const page of pages) {
    if (!page.asset_id) continue;
    const asset = byId.get(page.asset_id);
    if (!asset) continue;
    originals.push(asset.storage_path);
    knownThumbs.set(asset.storage_path, asset.thumb_storage_path);
  }
  // Thumbs only — never sign multi-MB photo originals when thumbs missing (t_206b5ff4).
  // Never sign the class PDF / files bucket original for the model.
  const thumbMap = await signedThumbUrls(originals, knownThumbs, { fallbackOriginal: false });
  for (const page of pages) {
    if (!page.asset_id) {
      page.thumbUrl = null;
      continue;
    }
    const asset = byId.get(page.asset_id);
    page.thumbUrl = asset ? thumbMap.get(asset.storage_path) ?? null : null;
  }

  return { batch, pages, packets, rosterCount };
}

/**
 * Persist split draft against live update-only save_ingest_split:
 * (1) insert new ids with non-colliding temp ordinals
 * (2) park ordinals so RPC renumber cannot hit unique(batch_id, ordinal)
 * (3) save_ingest_split under version lock
 * (4) best-effort delete removed drafts after RPC success (never roll back a committed RPC)
 * On RPC failure only: drop this-attempt inserts and restore prior ordinals.
 * Per-batch queue + version getter avoid overlapping saves corrupting drafts.
 */
export async function saveIngestSplit(
  batchId: string,
  packets: SplitPacketDraft[],
  version: number | (() => number),
): Promise<IngestBatchRow> {
  return enqueueExclusive(`ingest-split:${batchId}`, () =>
    saveIngestSplitUnlocked(batchId, packets, version),
  );
}

async function saveIngestSplitUnlocked(
  batchId: string,
  packets: SplitPacketDraft[],
  version: number | (() => number),
): Promise<IngestBatchRow> {
  const supabase = requireSupabase();
  const resolvedVersion = typeof version === 'function' ? version() : version;

  const { data: existing, error: listErr } = await supabase
    .from('ingest_packets')
    .select('id, ordinal, capture_id, status')
    .eq('batch_id', batchId);
  if (listErr) throw mapRpcError(listErr);

  const serverRows = (existing ?? []) as Array<{
    id: string;
    ordinal: number;
    capture_id: string | null;
    status: string;
  }>;
  const plan = planSaveIngestSplit(packets, serverRows);
  let inserted = false;
  let parked = false;
  let rpcSucceeded = false;

  try {
    if (plan.toInsert.length) {
      const { error } = await supabase.from('ingest_packets').insert(
        plan.toInsert.map((row) => ({
          id: row.id,
          batch_id: batchId,
          ordinal: row.tempOrdinal,
          page_ids: row.page_ids,
          blank: row.blank,
          status: 'draft',
        })),
      );
      if (error) throw mapRpcError(error);
      inserted = true;
    }

    for (let i = 0; i < plan.parkIds.length; i += 1) {
      const id = plan.parkIds[i]!;
      const { error } = await supabase
        .from('ingest_packets')
        .update({ ordinal: plan.parkBase + i })
        .eq('id', id)
        .eq('batch_id', batchId);
      if (error) throw mapRpcError(error);
    }
    parked = plan.parkIds.length > 0;

    const { data, error } = await supabase.rpc('save_ingest_split', {
      p_batch_id: batchId,
      p_packets: plan.rpcPackets,
      p_version: resolvedVersion,
    });
    if (error) throw mapRpcError(error);
    rpcSucceeded = true;

    // Best-effort: orphan draft rows retry on the next save's toDeleteAfter.
    // Never throw here — a committed RPC must not be undone by cleanup failure.
    if (plan.toDeleteAfter.length) {
      await supabase.from('ingest_packets').delete().in('id', plan.toDeleteAfter);
    }

    return data as IngestBatchRow;
  } catch (err) {
    if (shouldRollbackSplitPersist(rpcSucceeded)) {
      if (inserted && plan.toInsert.length) {
        await supabase
          .from('ingest_packets')
          .delete()
          .in(
            'id',
            plan.toInsert.map((row) => row.id),
          );
      }
      if (parked) {
        for (const row of plan.priorOrdinals) {
          await supabase
            .from('ingest_packets')
            .update({ ordinal: row.ordinal })
            .eq('id', row.id)
            .eq('batch_id', batchId);
        }
      }
    }
    throw err;
  }
}

export async function confirmIngestBatch(
  batchId: string,
  version: number,
): Promise<IngestBatchRow> {
  const { data, error } = await requireSupabase().rpc('confirm_ingest_batch', {
    p_batch_id: batchId,
    p_version: version,
  });
  if (error) throw mapRpcError(error);
  return data as IngestBatchRow;
}

export class IngestRpcError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'IngestRpcError';
  }
}

function mapRpcError(error: { message?: string; code?: string }): Error {
  const msg = error.message ?? 'Request failed';
  const known = [
    'unsupported_type',
    'too_large_bytes',
    'image_too_large',
    'not_teacher',
    'not_class_teacher',
    'not allowed',
    'batch not accepting files',
    'batch not in split_review',
    'batch not partial',
    'confirm_conflict',
    'no eligible packets',
    'no rasterized packets',
    'cannot abandon after confirm',
  ];
  for (const code of known) {
    if (msg.includes(code)) {
      return new IngestRpcError(code.replace(/\s+/g, '_'), humanize(code));
    }
  }
  return new IngestRpcError(error.code ?? 'rpc_error', msg);
}

function humanize(code: string): string {
  switch (code) {
    case 'unsupported_type':
      return 'That file type is not allowed. Use a PDF or a photo (JPEG, PNG, WebP, HEIC).';
    case 'too_large_bytes':
      return 'This scan is too large. Split it on the copier into smaller jobs (under 250 MB or 400 pages).';
    case 'image_too_large':
      return 'That photo is over 15 MB. Resave a smaller copy and try again.';
    case 'not_teacher':
    case 'not_class_teacher':
      return 'Only teachers of this class can upload a class stack.';
    case 'confirm_conflict':
      return 'Someone else updated this split. Reload and try again.';
    case 'no eligible packets':
      return 'Mark at least one non-blank packet before confirming.';
    case 'no rasterized packets':
      return 'Pages are still processing. Wait for rasterize to finish.';
    case 'batch not in split_review':
      return 'This stack is not ready for split review yet.';
    case 'batch not partial':
      return 'This stack is not waiting on a remainder retry.';
    case 'cannot abandon after confirm':
      return 'This stack is already confirmed.';
    default:
      return code;
  }
}
