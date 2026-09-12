/**
 * Orchestrate I1: bind class+N → gate MIME/caps → upload (TUS if >6MB) → register → mark received.
 * Never creates captures (I3). Never whole-file read / never base64 the class PDF.
 */

import {
  createIngestBatch,
  ingestMarkReceived,
  registerIngestFile,
  type IngestBatchRow,
} from '@/lib/ingest/api';
import {
  evaluateFileCaps,
  formatMb,
  normalizeMime,
  type CapVerdict,
} from '@/lib/ingest/caps';
import { INGEST_COPY } from '@/lib/ingest/copy';
import { sha256Blob } from '@/lib/ingest/hash';
import {
  uploadIngestObject,
  type UploadProgress,
} from '@/lib/ingest/uploadClient';

export type StackFile = {
  file: File | Blob;
  name: string;
  mimeType: string;
};

export type RunUploadProgress = {
  phase: 'hashing' | 'uploading' | 'registering' | 'finishing';
  fileIndex: number;
  fileCount: number;
  fileName: string;
  bytesUploaded: number;
  bytesTotal: number;
  method: 'tus' | 'standard' | null;
};

export type RunUploadResult =
  | {
      ok: true;
      batch: IngestBatchRow;
      softWarnings: string[];
      methods: Array<'tus' | 'standard'>;
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
      /** Named hard-fail before any register → 0 captures by construction. */
      capturesCreated: 0;
    };

function newFileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function gateStackFiles(
  files: StackFile[],
): CapVerdict & { softWarnings: string[] } {
  let batchBytes = 0;
  const softWarnings: string[] = [];
  for (const item of files) {
    const mime = normalizeMime(item.mimeType, item.name);
    const verdict = evaluateFileCaps({
      mimeType: mime,
      byteSize: item.file.size,
      batchBytesSoFar: batchBytes,
    });
    if (!verdict.ok) {
      return { ...verdict, softWarnings };
    }
    if (verdict.softWarn) softWarnings.push(...verdict.softReasons);
    batchBytes += item.file.size;
  }
  if (!files.length) {
    return {
      ok: false,
      errorCode: 'unsupported_type',
      message: 'Choose at least one PDF or photo.',
      softWarnings,
    };
  }
  return {
    ok: true,
    softWarn: softWarnings.length > 0,
    softReasons: softWarnings,
    useTus: files.some((f) => f.file.size > 6 * 1024 * 1024),
    softWarnings,
  };
}

export async function runClassStackUpload(input: {
  teacherId: string;
  classId: string;
  pagesPerStudent: number;
  assignmentId?: string | null;
  files: StackFile[];
  onProgress?: (p: RunUploadProgress) => void;
  signal?: AbortSignal;
}): Promise<RunUploadResult> {
  const gate = gateStackFiles(input.files);
  if (!gate.ok) {
    return {
      ok: false,
      errorCode: gate.errorCode,
      message: gate.message,
      capturesCreated: 0,
    };
  }

  let batch: IngestBatchRow;
  try {
    batch = await createIngestBatch({
      classId: input.classId,
      assignmentId: input.assignmentId,
      pagesPerStudent: input.pagesPerStudent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start the class stack.';
    return { ok: false, errorCode: 'create_failed', message, capturesCreated: 0 };
  }

  const methods: Array<'tus' | 'standard'> = [];
  const softWarnings = gate.softWarnings.slice();

  try {
    for (let i = 0; i < input.files.length; i += 1) {
      if (input.signal?.aborted) {
        return {
          ok: false,
          errorCode: 'aborted',
          message: 'Upload canceled.',
          capturesCreated: 0,
        };
      }
      const item = input.files[i]!;
      const mime = normalizeMime(item.mimeType, item.name);
      const fileId = newFileId();

      input.onProgress?.({
        phase: 'hashing',
        fileIndex: i,
        fileCount: input.files.length,
        fileName: item.name,
        bytesUploaded: 0,
        bytesTotal: item.file.size,
        method: null,
      });
      const sha256 = await sha256Blob(item.file);

      input.onProgress?.({
        phase: 'uploading',
        fileIndex: i,
        fileCount: input.files.length,
        fileName: item.name,
        bytesUploaded: 0,
        bytesTotal: item.file.size,
        method: item.file.size > 6 * 1024 * 1024 ? 'tus' : 'standard',
      });

      const uploaded = await uploadIngestObject({
        teacherId: input.teacherId,
        batchId: batch.id,
        fileId,
        file: item.file,
        filename: item.name,
        mimeType: mime,
        signal: input.signal,
        onProgress: (p: UploadProgress) => {
          input.onProgress?.({
            phase: 'uploading',
            fileIndex: i,
            fileCount: input.files.length,
            fileName: item.name,
            bytesUploaded: p.bytesUploaded,
            bytesTotal: p.bytesTotal,
            method: p.method,
          });
        },
      });
      methods.push(uploaded.method);

      input.onProgress?.({
        phase: 'registering',
        fileIndex: i,
        fileCount: input.files.length,
        fileName: item.name,
        bytesUploaded: item.file.size,
        bytesTotal: item.file.size,
        method: uploaded.method,
      });

      await registerIngestFile({
        batchId: batch.id,
        sortIndex: i,
        originalFilename: item.name,
        mimeType: mime,
        byteSize: item.file.size,
        sha256,
        storagePath: uploaded.storagePath,
        tusUploadId: uploaded.tusUploadUrl,
      });
    }

    input.onProgress?.({
      phase: 'finishing',
      fileIndex: input.files.length - 1,
      fileCount: input.files.length,
      fileName: '',
      bytesUploaded: 0,
      bytesTotal: 0,
      method: null,
    });
    batch = await ingestMarkReceived(batch.id);

    // Soft warn copy if large (bytes already known).
    if (batch.bytes_total > 40 * 1024 * 1024 && !softWarnings.length) {
      softWarnings.push(INGEST_COPY.softWarn(formatMb(batch.bytes_total)));
    }

    return { ok: true, batch, softWarnings, methods };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return {
      ok: false,
      errorCode: 'upload_failed',
      message,
      capturesCreated: 0,
    };
  }
}
