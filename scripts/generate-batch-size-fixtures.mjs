#!/usr/bin/env node
/**
 * FL-05 / B-SIZE-01 — generate batch-ingest size fixtures.
 *
 * Writes notes/qa-fixtures/batch-ingest/oversized-300mb.pdf with byte size
 * > HARD_FAIL_BYTES_EXACT (262_144_000). Target ~300 MiB. Uses truncate so
 * generation is fast (sparse on APFS/HFS+).
 *
 * The oversized file is gitignored — do not commit it.
 *
 * Optional: --encrypted also refreshes encrypted.pdf via the same Encrypt-dict
 * minimal PDF used by workers/ingest-rasterize/test/fixtures/makePdf.ts.
 *
 * Usage: node scripts/generate-batch-size-fixtures.mjs [--encrypted]
 */
import { mkdir, open, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Same constant as src/lib/ingest/caps.ts HARD_FAIL_BYTES_EXACT */
export const HARD_FAIL_BYTES_EXACT = 262_144_000;
/** ~300 MiB — comfortably above the 250 MiB hard-fail gate */
export const OVERSIZED_TARGET_BYTES = 300 * 1024 * 1024;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const FIXTURE_DIR = join(root, 'notes/qa-fixtures/batch-ingest');
export const OVERSIZED_PATH = join(FIXTURE_DIR, 'oversized-300mb.pdf');
export const ENCRYPTED_PATH = join(FIXTURE_DIR, 'encrypted.pdf');

/** Same Encrypt-dict minimal PDF as writeEncryptedPdfStub in makePdf.ts */
export const ENCRYPTED_PDF_BYTES = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /Filter /Standard /V 1 /R 2 /U (xxxxxxxxxxxxxxxx) /O (xxxxxxxxxxxxxxxx) /P -4 >>
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000190 00000 n 
trailer
<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>
startxref
280
%%EOF
`;

/**
 * Write a fast oversized PDF-shaped file (header + truncate).
 * @param {string} dest
 * @param {number} [byteSize]
 */
export async function writeOversizedPdf(dest, byteSize = OVERSIZED_TARGET_BYTES) {
  if (byteSize <= HARD_FAIL_BYTES_EXACT) {
    throw new Error(
      `byteSize must be > HARD_FAIL_BYTES_EXACT (${HARD_FAIL_BYTES_EXACT}); got ${byteSize}`,
    );
  }
  await mkdir(dirname(dest), { recursive: true });
  const header = Buffer.from(
    '%PDF-1.4\n% Kelyra FL-05 / B-SIZE-01 oversized fixture (no student names)\n',
    'utf8',
  );
  const fh = await open(dest, 'w');
  try {
    await fh.write(header, 0, header.length, 0);
    await fh.truncate(byteSize);
  } finally {
    await fh.close();
  }
  return dest;
}

export async function writeEncryptedPdf(dest = ENCRYPTED_PATH) {
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, ENCRYPTED_PDF_BYTES);
  return dest;
}

async function main() {
  const wantEncrypted = process.argv.includes('--encrypted');
  await mkdir(FIXTURE_DIR, { recursive: true });

  await writeOversizedPdf(OVERSIZED_PATH);
  const oversizedStat = await stat(OVERSIZED_PATH);
  console.log(
    `wrote ${OVERSIZED_PATH} (${oversizedStat.size} bytes; hard-fail gate=${HARD_FAIL_BYTES_EXACT})`,
  );
  if (oversizedStat.size <= HARD_FAIL_BYTES_EXACT) {
    process.exitCode = 1;
    console.error('ERROR: oversized fixture is not above HARD_FAIL_BYTES_EXACT');
    return;
  }

  if (wantEncrypted) {
    await writeEncryptedPdf(ENCRYPTED_PATH);
    console.log(`wrote ${ENCRYPTED_PATH} (Encrypt-dict minimal PDF)`);
  }
}

const isMain =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
