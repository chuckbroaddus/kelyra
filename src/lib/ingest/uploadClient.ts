/**
 * BATCH-v1 I1 upload client.
 * - >6 MB → TUS (Supabase 6 MB chunks) with byte progress
 * - ≤6 MB → standard storage.upload with File/Blob (never file-reader API / never base64 whole PDF)
 */

import * as tus from 'tus-js-client';

import { supabaseUrl } from '@/constants/config';
import { TUS_CHUNK_BYTES, shouldUseTus } from '@/lib/ingest/caps';
import { requireSupabase } from '@/lib/supabase/client';

export type UploadProgress = {
  bytesUploaded: number;
  bytesTotal: number;
  method: 'tus' | 'standard';
};

export type UploadResult = {
  storagePath: string;
  method: 'tus' | 'standard';
  tusUploadUrl: string | null;
};

function storageResumableEndpoint(): string {
  // Prefer direct storage hostname for large uploads (Supabase docs).
  try {
    const u = new URL(supabaseUrl);
    const host = u.hostname; // e.g. abcd.supabase.co
    if (host.endsWith('.supabase.co') && !host.includes('.storage.')) {
      const project = host.replace(/\.supabase\.co$/, '');
      return `https://${project}.storage.supabase.co/storage/v1/upload/resumable`;
    }
  } catch {
    // fall through
  }
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`;
}

async function accessToken(): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to upload a class stack.');
  return token;
}

/**
 * Upload a class-stack file into the private `files` bucket.
 * Pass a browser File/Blob — do not pre-read as base64 / file-reader API.
 */
export async function uploadIngestObject(input: {
  teacherId: string;
  batchId: string;
  fileId: string;
  file: Blob;
  filename: string;
  mimeType: string;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<UploadResult> {
  const ext = extensionFor(input.mimeType, input.filename);
  const storagePath = `${input.teacherId}/ingest/${input.batchId}/${input.fileId}.${ext}`;
  const size = input.file.size;

  if (shouldUseTus(size)) {
    const result = await tusUpload({
      file: input.file,
      storagePath,
      mimeType: input.mimeType,
      onProgress: input.onProgress,
      signal: input.signal,
    });
    return { storagePath, method: 'tus', tusUploadUrl: result.uploadUrl };
  }

  await standardUpload({
    file: input.file,
    storagePath,
    mimeType: input.mimeType,
    onProgress: input.onProgress,
  });
  return { storagePath, method: 'standard', tusUploadUrl: null };
}

async function standardUpload(input: {
  file: Blob;
  storagePath: string;
  mimeType: string;
  onProgress?: (p: UploadProgress) => void;
}): Promise<void> {
  input.onProgress?.({
    bytesUploaded: 0,
    bytesTotal: input.file.size,
    method: 'standard',
  });
  // Pass Blob/File directly — supabase-js streams/puts bytes; never base64 here.
  const { error } = await requireSupabase()
    .storage
    .from('files')
    .upload(input.storagePath, input.file, {
      contentType: input.mimeType,
      cacheControl: '3600',
      upsert: false,
    });
  if (error) throw error;
  input.onProgress?.({
    bytesUploaded: input.file.size,
    bytesTotal: input.file.size,
    method: 'standard',
  });
}

function tusUpload(input: {
  file: Blob;
  storagePath: string;
  mimeType: string;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<{ uploadUrl: string | null }> {
  return (async () => {
    const token = await accessToken();
    return new Promise<{ uploadUrl: string | null }>((resolve, reject) => {
      let settled = false;
      const upload = new tus.Upload(input.file, {
        endpoint: storageResumableEndpoint(),
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${token}`,
          'x-upsert': 'false',
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        chunkSize: TUS_CHUNK_BYTES,
        metadata: {
          bucketName: 'files',
          objectName: input.storagePath,
          contentType: input.mimeType,
          cacheControl: '3600',
        },
        onError(error) {
          if (settled) return;
          settled = true;
          reject(error);
        },
        onProgress(bytesUploaded, bytesTotal) {
          input.onProgress?.({
            bytesUploaded,
            bytesTotal,
            method: 'tus',
          });
        },
        onSuccess() {
          if (settled) return;
          settled = true;
          resolve({ uploadUrl: upload.url });
        },
      });

      const abort = () => {
        if (settled) return;
        settled = true;
        try {
          upload.abort(true);
        } catch {
          // ignore
        }
        reject(new DOMException('Upload aborted', 'AbortError'));
      };
      if (input.signal) {
        if (input.signal.aborted) {
          abort();
          return;
        }
        input.signal.addEventListener('abort', abort, { once: true });
      }

      upload
        .findPreviousUploads()
        .then((previous) => {
          if (previous.length) {
            upload.resumeFromPreviousUpload(previous[0]!);
          }
          upload.start();
        })
        .catch((err) => {
          if (settled) return;
          // If resume lookup fails, still start fresh.
          try {
            upload.start();
          } catch (startErr) {
            settled = true;
            reject(startErr ?? err);
          }
        });
    });
  })();
}

function extensionFor(mime: string, filename: string): string {
  const lower = mime.toLowerCase();
  if (lower.includes('pdf')) return 'pdf';
  if (lower.includes('png')) return 'png';
  if (lower.includes('webp')) return 'webp';
  if (lower.includes('heic')) return 'heic';
  if (lower.includes('heif')) return 'heif';
  if (lower.includes('jpeg') || lower.includes('jpg')) return 'jpg';
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? 'bin';
}

/** Test helper: which transport a size would use. */
export function uploadMethodForSize(byteSize: number): 'tus' | 'standard' {
  return shouldUseTus(byteSize) ? 'tus' : 'standard';
}
