import { requireSupabase } from '@/lib/supabase/client';

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
  error_code: string | null;
  error_message: string | null;
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
    default:
      return code;
  }
}
