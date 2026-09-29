/** Journal upload path, mime, and size guard. No @/ imports. */

export const DIARY_MAX_BYTES = 10_485_760;

export const DIARY_EMPTY_FILE_ERROR = 'That file was empty.';
export const DIARY_EMPTY_PHOTO_ERROR = 'That photo was empty.';
export const DIARY_SIZE_ERROR = 'Keep Journal files under 10 MB.';
export const DIARY_TYPE_ERROR =
  'That file type is not allowed. Use a PDF, Word, Excel, PowerPoint, text, CSV, or a photo (JPEG, PNG, WebP, HEIC).';

export const DIARY_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'text/rtf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const SEATS = new Set(['teacher', 'staff', 'parent']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DiaryStoragePathExpect = {
  ownerId: string;
  seat: string;
  entryId: string;
};

function normId(id: string): string {
  return id.trim().toLowerCase();
}

/** Exact, lowercase, parameters stripped. Does not infer a type from a filename. */
export function normalizeDiaryMime(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.split(';')[0].trim().toLowerCase();
}

export function isAllowedDiaryMime(raw: string | null | undefined): boolean {
  const mime = normalizeDiaryMime(raw);
  return (DIARY_ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

export function assertAllowedDiaryMime(raw: string | null | undefined): string {
  const mime = normalizeDiaryMime(raw);
  if (!isAllowedDiaryMime(mime)) throw new Error(DIARY_TYPE_ERROR);
  return mime;
}

export function assertDiaryByteSize(byteLength: number, emptyMessage: string): void {
  if (!byteLength) throw new Error(emptyMessage);
  if (byteLength > DIARY_MAX_BYTES) throw new Error(DIARY_SIZE_ERROR);
}

export function diaryFileExt(name: string): string {
  const ext = (name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
  return ext || 'bin';
}

export function diaryPhotoExt(mime: string): string {
  const normalized = normalizeDiaryMime(mime);
  if (normalized === 'image/png') return 'png';
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/heic') return 'heic';
  if (normalized === 'image/heif') return 'heif';
  return 'jpg';
}

export function diaryStoragePathOk(path: string, expected: DiaryStoragePathExpect): boolean {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (path.includes('\\') || path.includes('%') || path.includes('..')) return false;
  if (path.startsWith('/') || path.endsWith('/') || path.includes('//')) return false;
  const parts = path.split('/');
  if (parts.length !== 4) return false;
  const [uid, seat, entryId, objectName] = parts;
  if (!uid || !seat || !entryId || !objectName) return false;
  if (uid !== normId(expected.ownerId)) return false;
  if (seat !== expected.seat) return false;
  if (entryId !== normId(expected.entryId)) return false;
  if (!SEATS.has(seat)) return false;
  if (!UUID_RE.test(uid) || !UUID_RE.test(entryId)) return false;
  const dot = objectName.indexOf('.');
  if (dot <= 0 || objectName.indexOf('.', dot + 1) !== -1) return false;
  const stem = objectName.slice(0, dot);
  const ext = objectName.slice(dot + 1);
  if (!UUID_RE.test(stem)) return false;
  if (!/^[a-z0-9]{1,8}$/.test(ext)) return false;
  return true;
}

export function buildDiaryStoragePath(input: DiaryStoragePathExpect & { mediaId: string; ext: string }): string {
  const ownerId = normId(input.ownerId);
  const entryId = normId(input.entryId);
  const mediaId = normId(input.mediaId);
  const ext = input.ext.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const path = `${ownerId}/${input.seat}/${entryId}/${mediaId}.${ext}`;
  if (!diaryStoragePathOk(path, { ownerId, seat: input.seat, entryId })) {
    throw new Error('That file could not be saved to your Journal.');
  }
  return path;
}
