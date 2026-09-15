import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ERROR_COPY } from '../src/config.ts';
import { isEncryptedPdfMessage, RasterizeError } from '../src/errors.ts';
import { probePdf, renderPageToJpegFile } from '../src/pdf.ts';
import { expectPagesForSinglePdf, teacherFacingErrorMessage } from '../src/rasterize.ts';
import { writeEncryptedPdfStub, writeMultiPagePdf } from './fixtures/makePdf.ts';
import { normalizePageJpeg } from '../src/jpeg.ts';
import { detectBlank } from '../src/blank.ts';
import { buildPacketGuess } from '../src/packets.ts';

test('I2-25x1: 25-page PDF probes as 25 pages and renders 25 JPEGs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kelyra-i2-25-'));
  try {
    const pdfPath = join(dir, 'stack25.pdf');
    await writeMultiPagePdf(pdfPath, 25, true);
    const info = await probePdf(pdfPath);
    assert.equal(info.pages, 25);
    assert.equal(info.encrypted, false);

    const plan = expectPagesForSinglePdf(info.pages, 1);
    assert.equal(plan.pages, 25);
    assert.equal(plan.packets, 25);

    const pageIds: { id: string; pageIndex: number; blank: boolean }[] = [];
    let blankCount = 0;
    for (let i = 1; i <= 25; i += 1) {
      const jpgPath = await renderPageToJpegFile(pdfPath, i, dir);
      const raw = await readFile(jpgPath);
      const pair = await normalizePageJpeg(raw);
      const blank = await detectBlank(pair.full);
      if (blank) blankCount += 1;
      pageIds.push({ id: `id-${i}`, pageIndex: i - 1, blank });
      assert.ok(pair.full.byteLength > 0);
      assert.ok(pair.width > 0 && pair.height > 0);
    }
    // Acceptance: 25×1 PDF → 25 pages (ingest_pages rows), not Edge.
    assert.equal(pageIds.length, 25);
    assert.equal(blankCount, 0, 'inked fixture pages should not be blank');
    const packets = buildPacketGuess(pageIds, 1, true);
    assert.equal(packets.length, 25);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('I2-encrypted: named error encrypted_pdf; probe throws before pages', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kelyra-i2-enc-'));
  try {
    const pdfPath = join(dir, 'locked.pdf');
    await writeEncryptedPdfStub(pdfPath);
    await assert.rejects(
      () => probePdf(pdfPath),
      (err: unknown) => {
        assert.ok(err instanceof RasterizeError);
        assert.equal(err.code, 'encrypted_pdf');
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('I2-encrypted-helper: message classifier', () => {
  assert.equal(isEncryptedPdfMessage('Command Error: Incorrect password', ''), true);
  assert.equal(isEncryptedPdfMessage('', 'Encrypted:      yes (print:yes)'), true);
  assert.equal(isEncryptedPdfMessage('syntax error', 'Pages: 3'), false);
});

test('I2-corrupt: garbage file → corrupt_pdf with named copy; no pdfinfo/exec noise', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kelyra-i2-corrupt-'));
  try {
    const junkPath = join(dir, 'garbage.pdf');
    await writeFile(junkPath, Buffer.from('%PDF-not-a-real-file\nxref trailer boom\n'));
    await assert.rejects(
      () => probePdf(junkPath),
      (err: unknown) => {
        assert.ok(err instanceof RasterizeError);
        assert.equal(err.code, 'corrupt_pdf');
        assert.equal(err.message, ERROR_COPY.corrupt_pdf);
        assert.equal(err.message, 'File unreadable. Re-scan and upload again.');
        assert.doesNotMatch(err.message, /pdfinfo|pdftoppm|Command failed|xref|trailer|poppler/i);
        assert.equal(teacherFacingErrorMessage(err), ERROR_COPY.corrupt_pdf);
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('I2-corrupt: teacherFacingErrorMessage never keeps polluted corrupt_pdf message', () => {
  const polluted = new RasterizeError(
    'corrupt_pdf',
    'Command failed: pdfinfo /tmp/x.pdf\nSyntax Error: xref / trailer',
  );
  assert.equal(teacherFacingErrorMessage(polluted), ERROR_COPY.corrupt_pdf);
  assert.doesNotMatch(teacherFacingErrorMessage(polluted), /pdfinfo|Command failed|xref|trailer/i);

  const encrypted = new RasterizeError('encrypted_pdf');
  assert.equal(teacherFacingErrorMessage(encrypted), ERROR_COPY.encrypted_pdf);
});
