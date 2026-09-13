/** Wire copy atoms for BATCH-v1 I1 (options pack §5). */

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
  teachSeatOnly: 'Class stacks are available on the Teach seat.',
  uploading: 'Uploading…',
  received: 'Upload complete. Waiting for page processing…',
  markReceivedFailed: 'Could not finish the upload. Try again.',
  progressPages: (done: number, total: number) =>
    `${done}/${total} rasterized`,
  encryptedPdf:
    'Password or encrypted PDF. Unlock on the copier and upload again.',
} as const;

function formatProgressMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}
