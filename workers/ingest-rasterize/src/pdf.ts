/**
 * Poppler wrappers (pdfinfo / pdftoppm). Stream-friendly: work from a file path
 * (HTTP download streams to disk first). Never load whole PDF as Edge arrayBuffer.
 * DevOps may swap pdfium later behind the same interface.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { RasterizeError, isEncryptedPdfMessage } from './errors.ts';

const execFileAsync = promisify(execFile);

export type PdfInfo = {
  pages: number;
  encrypted: boolean;
};

export async function probePdf(filePath: string): Promise<PdfInfo> {
  try {
    const { stdout, stderr } = await execFileAsync(
      'pdfinfo',
      [filePath],
      { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const text = `${stdout}\n${stderr}`;
    if (isEncryptedPdfMessage(stderr, stdout)) {
      throw new RasterizeError('encrypted_pdf');
    }
    const enc = /^\s*Encrypted:\s*yes\b/im.test(text);
    if (enc) throw new RasterizeError('encrypted_pdf');

    const m = /^\s*Pages:\s*(\d+)\s*$/im.exec(text);
    // Teacher-facing: ERROR_COPY.corrupt_pdf only — never pdfinfo stderr.
    if (!m) throw new RasterizeError('corrupt_pdf');
    return { pages: Number(m[1]), encrypted: false };
  } catch (err) {
    if (err instanceof RasterizeError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    const out =
      err && typeof err === 'object' && 'stderr' in err
        ? String((err as { stderr?: Buffer | string }).stderr ?? '')
        : '';
    const stdout =
      err && typeof err === 'object' && 'stdout' in err
        ? String((err as { stdout?: Buffer | string }).stdout ?? '')
        : '';
    if (isEncryptedPdfMessage(out + msg, stdout)) {
      throw new RasterizeError('encrypted_pdf');
    }
    // Do not persist Command failed / pdfinfo / xref / trailer on the batch row.
    throw new RasterizeError('corrupt_pdf');
  }
}

/**
 * Render one 1-based page to a JPEG file via pdftoppm.
 * Uses a DPI that typically lands near 1600–2048 long-edge for letter pages;
 * caller still normalizes with sharp.
 */
export async function renderPageToJpegFile(
  pdfPath: string,
  pageOneBased: number,
  outDir: string,
  dpi = 150,
): Promise<string> {
  const prefix = join(outDir, `p${pageOneBased}`);
  try {
    await execFileAsync(
      'pdftoppm',
      [
        '-jpeg',
        '-jpegopt',
        'quality=90',
        '-r',
        String(dpi),
        '-f',
        String(pageOneBased),
        '-l',
        String(pageOneBased),
        '-singlefile',
        pdfPath,
        prefix,
      ],
      { timeout: 15_000, maxBuffer: 4 * 1024 * 1024 },
    );
  } catch (err) {
    if (err instanceof RasterizeError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    const stderr =
      err && typeof err === 'object' && 'stderr' in err
        ? String((err as { stderr?: Buffer | string }).stderr ?? '')
        : '';
    const stdout =
      err && typeof err === 'object' && 'stdout' in err
        ? String((err as { stdout?: Buffer | string }).stdout ?? '')
        : '';
    if (isEncryptedPdfMessage(stderr + msg, stdout)) {
      throw new RasterizeError('encrypted_pdf');
    }
    // Named ERROR_COPY.corrupt_pdf only — never pdftoppm command/stderr.
    throw new RasterizeError('corrupt_pdf');
  }

  const jpegPath = `${prefix}.jpg`;
  try {
    await access(jpegPath, constants.R_OK);
  } catch {
    throw new RasterizeError('corrupt_pdf');
  }
  return jpegPath;
}

/** Image files = one page each (architecture §6.3). */
export function isImageMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return (
    m === 'image/jpeg' ||
    m === 'image/jpg' ||
    m === 'image/png' ||
    m === 'image/webp' ||
    m === 'image/heic' ||
    m === 'image/heif'
  );
}

export function isPdfMime(mime: string): boolean {
  return mime.toLowerCase() === 'application/pdf';
}
