import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';

import { isEncryptedPdfMessage } from '../src/errors.ts';
import { RasterizeError } from '../src/errors.ts';
import { probePdf, renderPageToJpegFile } from '../src/pdf.ts';
import { expectPagesForSinglePdf } from '../src/rasterize.ts';
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
