/**
 * Stream HTTP download to a file (no full in-memory buffer of class PDF on Edge).
 */
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export async function streamDownloadToFile(url: string, destPath: string, headers?: Record<string, string>): Promise<number> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`download failed: ${res.status} ${await res.text()}`);
  }
  if (!res.body) throw new Error('download failed: empty body');

  const nodeStream = Readable.fromWeb(res.body as import('node:stream/web').ReadableStream);
  await pipeline(nodeStream, createWriteStream(destPath));

  const { stat } = await import('node:fs/promises');
  const st = await stat(destPath);
  return st.size;
}

export async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // ignore
  }
}
