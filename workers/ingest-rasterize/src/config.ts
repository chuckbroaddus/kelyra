/** BATCH-v1 I2 locked caps (architecture §6–§7). */

export const MAX_PAGES = 400;
export const MAX_BATCH_BYTES = 262_144_000; // 250 MiB
export const JPEG_LONG_EDGE_MAX = 2048;
export const JPEG_LONG_EDGE_MIN = 1600;
export const JPEG_QUALITY = 0.85; // 0.82–0.88
export const JPEG_HARD_MAX_BYTES = 4 * 1024 * 1024;
export const THUMB_LONG_EDGE = 400;
export const THUMB_QUALITY = 0.7;
export const POLL_MS = 2000;
export const PAGE_TIMEOUT_MS = 10_000;
export const DAY_PAGE_CAP = 2000;

/** Blank detect: mean luminance ≥ this and low ink → blank guess. */
export const BLANK_LUMA_MIN = 0.97;
export const BLANK_INK_MAX = 0.015;

export type RasterizeConfig = {
  maxPages: number;
  jpegLongEdgeMax: number;
  jpegLongEdgeMin: number;
  jpegQuality: number;
  jpegHardMaxBytes: number;
  thumbLongEdge: number;
  thumbQuality: number;
  blankLumaMin: number;
  blankInkMax: number;
};

export const DEFAULT_CONFIG: RasterizeConfig = {
  maxPages: MAX_PAGES,
  jpegLongEdgeMax: JPEG_LONG_EDGE_MAX,
  jpegLongEdgeMin: JPEG_LONG_EDGE_MIN,
  jpegQuality: JPEG_QUALITY,
  jpegHardMaxBytes: JPEG_HARD_MAX_BYTES,
  thumbLongEdge: THUMB_LONG_EDGE,
  thumbQuality: THUMB_QUALITY,
  blankLumaMin: BLANK_LUMA_MIN,
  blankInkMax: BLANK_INK_MAX,
};

export const ERROR_CODES = {
  encrypted_pdf: 'encrypted_pdf',
  corrupt_pdf: 'corrupt_pdf',
  too_many_pages: 'too_many_pages',
  day_page_cap: 'day_page_cap',
  raster_timeout: 'raster_timeout',
  unsupported_type: 'unsupported_type',
  worker_dead: 'worker_dead',
} as const;

export type IngestErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_COPY: Record<IngestErrorCode, string> = {
  encrypted_pdf: 'Password or encrypted PDF. Unlock on the copier and upload again.',
  corrupt_pdf: 'File unreadable. Re-scan and upload again.',
  too_many_pages: 'Over 400 pages — split the stack on the MFP.',
  day_page_cap: 'Daily scan limit — try tomorrow.',
  raster_timeout: 'Page processing timed out. Retry the remainder.',
  unsupported_type: 'That file type is not allowed.',
  worker_dead: 'Processing stopped. Retry the remainder.',
};
