/**
 * SHA-256 of a Blob/File without file-reader API and without base64.
 * Reads via Blob.slice + arrayBuffer in chunks so we never base64 the class PDF.
 */

const CHUNK = 2 * 1024 * 1024;

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += 1) {
    out += bytes[i]!.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Prefer Web Crypto on the whole buffer for small files.
 * For larger files, still use arrayBuffer on slices only for hashing — never file-reader API.readAsDataURL.
 */
export async function sha256Blob(blob: Blob): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Secure hashing is not available in this browser.');
  }

  // Small files: one digest.
  if (blob.size <= CHUNK) {
    const buf = await blob.arrayBuffer();
    return toHex(await crypto.subtle.digest('SHA-256', buf));
  }

  // Incremental SHA-256 via SubtleCrypto is not streamable everywhere.
  // Concatenate slice digests is WRONG cryptographically — load via slices into one buffer
  // only when size is within the hard cap (≤250 MiB). Callers must hard-fail above that first.
  if (blob.size > 262_144_000) {
    throw new Error('File too large to hash.');
  }

  const full = new Uint8Array(blob.size);
  let offset = 0;
  while (offset < blob.size) {
    const end = Math.min(offset + CHUNK, blob.size);
    const part = new Uint8Array(await blob.slice(offset, end).arrayBuffer());
    full.set(part, offset);
    offset = end;
  }
  return toHex(await crypto.subtle.digest('SHA-256', full.buffer));
}
