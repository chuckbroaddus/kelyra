import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HARD_FAIL_BYTES_EXACT,
  IMAGE_HARD_FAIL_BYTES,
  SOFT_WARN_BYTES,
  TUS_THRESHOLD_BYTES,
  evaluateFileCaps,
  formatFileSize,
  formatMb,
  shouldUseTus,
} from './caps.ts';
import { INGEST_COPY } from './copy.ts';

test('I1-01 TUS threshold: >6MB uses TUS; 6MB exact may standard; 55MB TUS', () => {
  assert.equal(shouldUseTus(TUS_THRESHOLD_BYTES), false);
  assert.equal(shouldUseTus(TUS_THRESHOLD_BYTES + 1), true);
  assert.equal(shouldUseTus(55 * 1024 * 1024), true);
  assert.equal(shouldUseTus(5 * 1024 * 1024), false);
});

test('I1-02 251 MB named hard fail (0 captures by construction at gate)', () => {
  const bytes = 251 * 1024 * 1024;
  assert.ok(bytes > HARD_FAIL_BYTES_EXACT);
  const verdict = evaluateFileCaps({
    mimeType: 'application/pdf',
    byteSize: bytes,
  });
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.errorCode, 'too_large_bytes');
    assert.match(verdict.message, /split/i);
    assert.match(verdict.message, /250 MB|MFP|copier/i);
  }
});

test('I1-03 soft warn >40 MB continues allowed + TUS', () => {
  const verdict = evaluateFileCaps({
    mimeType: 'application/pdf',
    byteSize: SOFT_WARN_BYTES + 1,
  });
  assert.equal(verdict.ok, true);
  if (verdict.ok) {
    assert.equal(verdict.softWarn, true);
    assert.equal(verdict.useTus, true);
  }
});

test('I1-04 MIME reject unsupported; accept pdf/jpeg', () => {
  const bad = evaluateFileCaps({ mimeType: 'application/zip', byteSize: 1000 });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.errorCode, 'unsupported_type');

  const pdf = evaluateFileCaps({ mimeType: 'application/pdf', byteSize: 1000 });
  assert.equal(pdf.ok, true);

  const jpg = evaluateFileCaps({ mimeType: 'image/jpeg', byteSize: 1000 });
  assert.equal(jpg.ok, true);
});

test('I1-05 single image >15 MB hard fails', () => {
  const verdict = evaluateFileCaps({
    mimeType: 'image/png',
    byteSize: IMAGE_HARD_FAIL_BYTES + 1,
  });
  assert.equal(verdict.ok, false);
  if (!verdict.ok) assert.equal(verdict.errorCode, 'image_too_large');
});

test('I1-06 page hard fail >400 with MFP copy', () => {
  const verdict = evaluateFileCaps({
    mimeType: 'application/pdf',
    byteSize: 10_000,
    pageCount: 401,
  });
  assert.equal(verdict.ok, false);
  if (!verdict.ok) {
    assert.equal(verdict.errorCode, 'too_many_pages');
    assert.match(verdict.message, /MFP|split/i);
  }
});

test('I1-07 wire copy atoms present', () => {
  assert.equal(INGEST_COPY.entry, 'Upload class stack');
  assert.match(INGEST_COPY.hardFailSize, /250 MB/);
  assert.match(INGEST_COPY.phoneGate, /computer/i);
  assert.equal(INGEST_COPY.progressPages(12, 120), '12/120 rasterized');
  assert.match(INGEST_COPY.encryptedPdf, /encrypted|password/i);
});

test('I5-07 partial / retry copy atoms present', () => {
  assert.equal(INGEST_COPY.retryRemainder, 'Retry remainder');
  assert.match(INGEST_COPY.rasterTimeout, /Retry the remainder/);
  assert.match(INGEST_COPY.workerDead, /Retry the remainder/);
  assert.match(INGEST_COPY.partialBanner('Gap named.', 20, 40), /20\/40/);
  assert.match(INGEST_COPY.partialBanner('Gap named.', 20, 40), /Gap named/);
  assert.equal(INGEST_COPY.abandonPartial, 'Abandon stack');
  assert.match(INGEST_COPY.resumeOpenPartial, /Resuming|open stack/i);
});

test('I3-07 SR-A copy atoms present', () => {
  assert.equal(INGEST_COPY.splitTitle, 'Split review');
  assert.match(INGEST_COPY.splitConfirm, /Confirm/i);
  assert.match(INGEST_COPY.splitKeys, /S split/);
  assert.match(INGEST_COPY.splitLead, /Needs Attention/i);
  assert.match(INGEST_COPY.splitPhoneWaiting, /computer/i);
});

test('B-SIZE-01 / FL-05: generator-backed oversized file fails evaluateFileCaps with too_large_bytes', async () => {
  const { mkdtemp, open, rm, stat } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const dir = await mkdtemp(join(tmpdir(), 'kelyra-bsize-'));
  try {
    const pdfPath = join(dir, 'oversized-300mb.pdf');
    // Fast sparse/truncated file — same approach as scripts/generate-batch-size-fixtures.mjs
    const targetBytes = HARD_FAIL_BYTES_EXACT + 1;
    const fh = await open(pdfPath, 'w');
    try {
      const header = Buffer.from('%PDF-1.4\n% B-SIZE-01 oversized fixture (no student names)\n');
      await fh.write(header, 0, header.length, 0);
      await fh.truncate(targetBytes);
    } finally {
      await fh.close();
    }
    const { size } = await stat(pdfPath);
    assert.ok(size > HARD_FAIL_BYTES_EXACT, `expected size > ${HARD_FAIL_BYTES_EXACT}, got ${size}`);

    const verdict = evaluateFileCaps({
      mimeType: 'application/pdf',
      byteSize: size,
    });
    assert.equal(verdict.ok, false);
    if (!verdict.ok) {
      assert.equal(verdict.errorCode, 'too_large_bytes');
      assert.match(verdict.message, /split|250 MB|MFP|copier/i);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});



test('formatFileSize avoids 0.0 MB for small PDFs (t_d572c9b6)', () => {
  assert.equal(formatFileSize(429), '429 B');
  assert.match(formatFileSize(12 * 1024), /KB/);
  assert.notEqual(`${formatMb(429)} MB`, formatFileSize(429));
});