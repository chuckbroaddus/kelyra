/** Wire copy atoms for BATCH-v1 I1 / I5 (options pack §5). */

export const INGEST_COPY = {
  entry: 'Upload class stack',
  entryNeeds: 'Upload a class stack',
  binderTitle: 'Class stack',
  pagesPerStudent: 'Pages per student',
  ignoreBlankBacks: 'Ignore blank backs',
  dropZone: 'Drop PDF or images · or choose files',
  softWarn: (mb: string) => `This scan is ${mb} MB. Stay on Wi-Fi.`,
  hardFailSize:
    'This scan is too large. Split it on the copier into smaller jobs (under 250 MB or 400 pages).',
  hardFailPages: (n: number) => `Too many pages (${n}). Split the stack on the MFP.`,
  unsupportedType: 'That file type is not allowed. Use a PDF or a photo (JPEG, PNG, WebP, HEIC).',
  phoneGate: 'Open Kelyra on a computer to split this scan.',
  cancel: 'Cancel upload',
  cancelBody: 'Remove staged pages? Nothing has been filed yet.',
  resume: (pct: number) => `Upload paused at ${pct}%. We’ll resume — don’t delete the file.`,
  progressBytes: (uploaded: number, total: number) =>
    `${formatProgressMb(uploaded)} / ${formatProgressMb(total)} MB`,
  classRequired: 'Choose a class before uploading the stack.',
  classStackSources: 'Ingest Folders',
  teachSeatOnly: 'Class stacks are available on the Teach seat.',
  uploading: 'Uploading…',
  received: 'Upload complete. Waiting for page processing…',
  markReceivedFailed: 'Could not finish the upload. Try again.',
  progressPages: (done: number, total: number) =>
    `${done}/${total} rasterized`,
  encryptedPdf:
    'Password or encrypted PDF. Unlock on the copier and upload again.',
  // I5 partial / retry remainder
  rasterTimeout: 'Page processing timed out. Retry the remainder.',
  workerDead: 'Processing stopped. Retry the remainder.',
  corruptPdf: 'File unreadable. Re-scan and upload again.',
  tooManyPages: 'Over 400 pages — split the stack on the MFP.',
  dayPageCap: 'Daily scan limit — try tomorrow.',
  retryRemainder: 'Retry remainder',
  retryRemainderBusy: 'Retrying remainder…',
  retryRemainderFailed: 'Could not retry the remainder. Try again.',
  abandonPartial: 'Abandon stack',
  abandonPartialBusy: 'Abandoning…',
  abandonPartialFailed: 'Could not abandon this stack. Retry the remainder or try again.',
  abandonAfterConfirm:
    'Some packets are already in Needs Attention. Retry the remainder — this stack cannot be abandoned.',
  resumeOpenPartial: 'Resuming an open stack for this class…',
  partialBanner: (gap: string, done: number, total: number | null) =>
    total != null && total > 0
      ? `${gap} Kept ${done}/${total} pages — retry the remainder (no re-upload).`
      : `${gap} Kept ${done} page${done === 1 ? '' : 's'} — retry the remainder (no re-upload).`,
  // SR-A Split Review
  splitTitle: 'Split review',
  splitLead: 'Check packet stacks. Names are assigned later in Needs Attention.',
  splitConfirm: 'Confirm split',
  splitConfirming: 'Filing packets…',
  splitSaving: 'Saving draft…',
  splitCancel: 'Cancel stack',
  splitCancelBody: 'Abandon this stack? Nothing has been filed yet.',
  splitKeys: 'S split · M merge · B blank',
  splitBlank: 'Blank',
  splitMerge: 'Merge',
  splitSplit: 'Split',
  splitMoveUp: 'Move up',
  splitMoveDown: 'Move down',
  splitEmptyConfirm: 'Add at least one non-blank packet to confirm.',
  splitDone: 'Packets filed to Needs Attention (unnamed).',
  splitFailed: 'Page processing failed.',
  splitPhoneWaiting: 'Pages are ready. Open Kelyra on a computer to split this scan.',
  splitRosterMismatch: 'Packet count does not match the roster — check blanks and splits.',
} as const;

/** True when error_message looks like poppler/exec tool noise (never show to teachers). */
export function looksLikeIngestToolNoise(message: string): boolean {
  return /pdfinfo|pdftoppm|Command failed|\bxref\b|\btrailer\b|poppler/i.test(message);
}

/**
 * Name the gap for partial banners.
 * corrupt_pdf always uses named copy (ignore polluted error_message).
 * Other known codes: clean custom overrides win; tool/exec noise falls back to named copy.
 */
export function ingestGapCopy(
  errorCode: string | null | undefined,
  errorMessage: string | null | undefined,
): string {
  // Never surface pdfinfo/xref/trailer — even if a stale batch row still has them.
  if (errorCode === 'corrupt_pdf') return INGEST_COPY.corruptPdf;

  const trimmed = errorMessage?.trim() ?? '';
  if (trimmed && !looksLikeIngestToolNoise(trimmed)) return trimmed;

  switch (errorCode) {
    case 'raster_timeout':
      return INGEST_COPY.rasterTimeout;
    case 'worker_dead':
      return INGEST_COPY.workerDead;
    case 'encrypted_pdf':
      return INGEST_COPY.encryptedPdf;
    case 'too_many_pages':
      return INGEST_COPY.tooManyPages;
    case 'day_page_cap':
      return INGEST_COPY.dayPageCap;
    case 'unsupported_type':
      return INGEST_COPY.unsupportedType;
    default:
      return INGEST_COPY.splitFailed;
  }
}

function formatProgressMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
