/** BATCH-v1 I1 size / MIME gates (architecture §6, BATCH-13). */

export const TUS_THRESHOLD_BYTES = 6 * 1024 * 1024; // 6 MiB — Supabase TUS chunk size
export const SOFT_WARN_BYTES = 40 * 1024 * 1024; // 40 MiB
export const HARD_FAIL_BYTES = 250 * 1024 * 1024; // 250 MiB = 262144000
export const HARD_FAIL_BYTES_EXACT = 262_144_000;
export const SOFT_WARN_PAGES = 80;
export const HARD_FAIL_PAGES = 400;
export const IMAGE_HARD_FAIL_BYTES = 15 * 1024 * 1024; // 15 MiB
export const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

export const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

export type IngestErrorCode =
  | 'unsupported_type'
  | 'too_large_bytes'
  | 'too_many_pages'
  | 'image_too_large'
  | 'not_teacher'
  | 'not_class_teacher'
  | 'class_required'
  | 'tus_expired';

export type CapVerdict =
  | { ok: true; softWarn: boolean; softReasons: string[]; useTus: boolean }
  | { ok: false; errorCode: IngestErrorCode; message: string };

export function normalizeMime(mime: string | null | undefined, filename?: string): string {
  const raw = (mime ?? '').trim().toLowerCase();
  if (raw && raw !== 'application/octet-stream') return raw;
  const name = (filename ?? '').toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.heic')) return 'image/heic';
  if (name.endsWith('.heif')) return 'image/heif';
  return raw;
}

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

export function shouldUseTus(byteSize: number): boolean {
  return byteSize > TUS_THRESHOLD_BYTES;
}

/**
 * Evaluate one file against soft/hard caps.
 * Page count is optional (often unknown until worker); bytes always known from File.size.
 */
export function evaluateFileCaps(input: {
  mimeType: string;
  byteSize: number;
  pageCount?: number | null;
  /** Running sum of other accepted files in this batch (bytes). */
  batchBytesSoFar?: number;
}): CapVerdict {
  const mime = normalizeMime(input.mimeType);
  if (!isAllowedMime(mime)) {
    return {
      ok: false,
      errorCode: 'unsupported_type',
      message: 'That file type is not allowed. Use a PDF or a photo (JPEG, PNG, WebP, HEIC).',
    };
  }

  const size = Math.max(0, Math.floor(input.byteSize || 0));
  if (isImageMime(mime) && size > IMAGE_HARD_FAIL_BYTES) {
    return {
      ok: false,
      errorCode: 'image_too_large',
      message: 'That photo is over 15 MB. Resave a smaller copy and try again.',
    };
  }

  const batchTotal = (input.batchBytesSoFar ?? 0) + size;
  if (batchTotal > HARD_FAIL_BYTES_EXACT) {
    return {
      ok: false,
      errorCode: 'too_large_bytes',
      message:
        'This scan is too large. Split it on the copier into smaller jobs (under 250 MB or 400 pages).',
    };
  }

  const pages = input.pageCount;
  if (pages != null && pages > HARD_FAIL_PAGES) {
    return {
      ok: false,
      errorCode: 'too_many_pages',
      message: `Too many pages (${pages}). Split the stack on the MFP.`,
    };
  }

  const softReasons: string[] = [];
  if (batchTotal > SOFT_WARN_BYTES) {
    softReasons.push(`This scan is ${formatMb(batchTotal)} MB. Stay on Wi-Fi.`);
  }
  if (pages != null && pages > SOFT_WARN_PAGES) {
    softReasons.push(`This scan has ${pages} pages. Stay on Wi-Fi.`);
  }

  return {
    ok: true,
    softWarn: softReasons.length > 0,
    softReasons,
    useTus: shouldUseTus(size),
  };
}

/** MB string for soft-warn copy (large scans). Prefer formatFileSize for UI labels. */
export function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1);
}

/** Human size with unit — avoids 0.0 MB for sub-50KB class-stack files (t_d572c9b6). */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
}
