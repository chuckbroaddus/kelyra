/**
 * Core batch rasterize loop (architecture §7).
 * Never sends class PDF (or any bytes) to a model — ADR-016 / BATCH-12/19.
 * I5: mid-run fail after ≥1 page → status partial (retry remainder); 0 pages → failed.
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

import { detectBlank } from './blank.ts';
import {
  DAY_PAGE_CAP,
  DEFAULT_CONFIG,
  ERROR_COPY,
  ERROR_CODES,
  MAX_PAGES,
  PAGE_TIMEOUT_MS,
  type IngestErrorCode,
  type RasterizeConfig,
} from './config.ts';
import {
  createSignedFileUrl,
  insertAsset,
  listBatchFiles,
  listRasterizedPages,
  markIncompletePagesFailed,
  replaceDraftPackets,
  updateBatchProgress,
  updateFilePageCount,
  uploadPhoto,
  upsertIngestPage,
  countTeacherPagesToday,
  type BatchRow,
} from './db.ts';
import { streamDownloadToFile, safeUnlink } from './download.ts';
import { RasterizeError } from './errors.ts';
import { batchFailStatus, resolveFailPagesDone } from './failStatus.ts';
import { normalizePageJpeg } from './jpeg.ts';
import { buildPacketGuess } from './packets.ts';
import { isImageMime, isPdfMime, probePdf, renderPageToJpegFile } from './pdf.ts';

export type PageRecord = {
  id: string;
  pageIndex: number;
  blank: boolean;
};

export { batchFailStatus, resolveFailPagesDone };

async function withPageTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new RasterizeError('raster_timeout', ERROR_COPY.raster_timeout));
        }, PAGE_TIMEOUT_MS);
      }),
    ]);
  } catch (err) {
    if (err instanceof RasterizeError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    if (/timeout/i.test(msg)) {
      throw new RasterizeError('raster_timeout', `${ERROR_COPY.raster_timeout} (${label})`);
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function rasterizeBatch(
  supabase: SupabaseClient,
  batch: BatchRow,
  config: RasterizeConfig = DEFAULT_CONFIG,
): Promise<void> {
  // Seed known progress BEFORE download/probe so early fails on retry_remainder
  // cannot wipe partial → failed with pages_done=0.
  const pageRecords: PageRecord[] = [];
  const seeded = await listRasterizedPages(supabase, batch.id);
  for (const p of seeded) {
    pageRecords.push({ id: p.id, pageIndex: p.page_index, blank: p.blank });
  }
  const seedPagesDone = resolveFailPagesDone({
    inMemoryCount: pageRecords.length,
    batchPagesDone: batch.pages_done,
    rasterizedCount: seeded.length,
  });

  const files = await listBatchFiles(supabase, batch.id);
  if (files.length === 0) {
    await failBatch(supabase, batch.id, 'corrupt_pdf', ERROR_COPY.corrupt_pdf, {
      pagesDone: seedPagesDone,
      batchPagesDone: batch.pages_done,
    });
    return;
  }

  const dayPages = await countTeacherPagesToday(supabase, batch.teacher_id);
  if (dayPages >= DAY_PAGE_CAP) {
    await failBatch(supabase, batch.id, 'day_page_cap', ERROR_COPY.day_page_cap, {
      pagesDone: seedPagesDone,
      batchPagesDone: batch.pages_done,
    });
    return;
  }

  const workRoot = await mkdtemp(join(tmpdir(), 'kelyra-raster-'));
  let globalIndex = 0;
  let totalPages = 0;
  const filePlans: { file: (typeof files)[0]; pages: number; localPath: string }[] = [];

  try {
    // First pass: probe totals (PDF page counts / images=1) before rendering.
    for (const file of files) {
      const localPath = join(workRoot, `${file.sort_index}-${file.id}`);
      const signed = await createSignedFileUrl(supabase, file.storage_path);
      await streamDownloadToFile(signed, localPath);

      if (isPdfMime(file.mime_type)) {
        let info;
        try {
          info = await probePdf(localPath);
        } catch (err) {
          if (err instanceof RasterizeError) {
            await failBatch(supabase, batch.id, err.code, teacherFacingErrorMessage(err), {
              pagesDone: pageRecords.length,
              pageCount: totalPages || null,
              batchPagesDone: batch.pages_done,
            });
            return;
          }
          throw err;
        }
        if (totalPages + info.pages > MAX_PAGES) {
          await failBatch(supabase, batch.id, 'too_many_pages', ERROR_COPY.too_many_pages, {
            pagesDone: pageRecords.length,
            pageCount: totalPages || null,
            batchPagesDone: batch.pages_done,
          });
          return;
        }
        totalPages += info.pages;
        await updateFilePageCount(supabase, file.id, info.pages);
        filePlans.push({ file, pages: info.pages, localPath });
      } else if (isImageMime(file.mime_type)) {
        if (totalPages + 1 > MAX_PAGES) {
          await failBatch(supabase, batch.id, 'too_many_pages', ERROR_COPY.too_many_pages, {
            pagesDone: pageRecords.length,
            pageCount: totalPages || null,
            batchPagesDone: batch.pages_done,
          });
          return;
        }
        totalPages += 1;
        await updateFilePageCount(supabase, file.id, 1);
        filePlans.push({ file, pages: 1, localPath });
      } else {
        await failBatch(supabase, batch.id, 'unsupported_type', ERROR_COPY.unsupported_type, {
          pagesDone: pageRecords.length,
          pageCount: totalPages || null,
          batchPagesDone: batch.pages_done,
        });
        return;
      }
    }

    // Refresh map after probe (seed already populated pageRecords).
    const alreadyByIndex = new Map(pageRecords.map((p) => [p.pageIndex, p]));

    await updateBatchProgress(supabase, batch.id, {
      page_count: totalPages,
      pages_done: pageRecords.length,
    });

    if (dayPages + totalPages > DAY_PAGE_CAP) {
      await failBatch(supabase, batch.id, 'day_page_cap', ERROR_COPY.day_page_cap, {
        pagesDone: pageRecords.length,
        pageCount: totalPages,
        batchPagesDone: batch.pages_done,
      });
      return;
    }

    const { mkdir } = await import('node:fs/promises');

    for (const plan of filePlans) {
      const pageDir = join(workRoot, `pages-${plan.file.id}`);
      await mkdir(pageDir, { recursive: true });

      for (let filePage = 0; filePage < plan.pages; filePage += 1) {
        const pageIndex = globalIndex;
        globalIndex += 1;

        if (alreadyByIndex.has(pageIndex)) {
          continue; // idempotent: already rasterized (retry_remainder resume)
        }

        let rawJpeg: Buffer;
        if (isPdfMime(plan.file.mime_type)) {
          const rendered = await withPageTimeout(
            renderPageToJpegFile(plan.localPath, filePage + 1, pageDir),
            `page ${pageIndex}`,
          );
          rawJpeg = await readFile(rendered);
          await safeUnlink(rendered);
        } else {
          rawJpeg = await readFile(plan.localPath);
        }

        const pair = await withPageTimeout(
          normalizePageJpeg(rawJpeg, config),
          `normalize ${pageIndex}`,
        );
        const blank = await detectBlank(pair.full, config);

        const storagePath = `${batch.teacher_id}/ingest/${batch.id}/p-${pageIndex}.jpg`;
        const thumbPath = `${batch.teacher_id}/ingest/${batch.id}/p-${pageIndex}_thumb.jpg`;

        await uploadPhoto(supabase, storagePath, pair.full);
        await uploadPhoto(supabase, thumbPath, pair.thumb);

        const assetId = await insertAsset(supabase, {
          teacherId: batch.teacher_id,
          storagePath,
          thumbStoragePath: thumbPath,
          byteSize: pair.full.byteLength,
        });

        const page = await upsertIngestPage(supabase, {
          batchId: batch.id,
          fileId: plan.file.id,
          pageIndex,
          filePageIndex: filePage,
          assetId,
          blank,
          byteSize: pair.full.byteLength,
          status: 'rasterized',
        });

        pageRecords.push({ id: page.id, pageIndex, blank });
        await updateBatchProgress(supabase, batch.id, {
          pages_done: pageRecords.length,
          page_count: totalPages,
        });
      }

      await safeUnlink(plan.localPath);
    }

    const packets = buildPacketGuess(
      pageRecords,
      batch.pages_per_student,
      batch.ignore_blank_backs,
    );
    await replaceDraftPackets(supabase, batch.id, packets);

    await updateBatchProgress(supabase, batch.id, {
      status: 'split_review',
      pages_done: totalPages,
      page_count: totalPages,
      error_code: null,
      error_message: null,
    });
  } catch (err) {
    const code =
      err instanceof RasterizeError
        ? err.code
        : /timeout|ECONNRESET|SIGTERM|worker/i.test(err instanceof Error ? err.message : String(err))
          ? 'worker_dead'
          : 'corrupt_pdf';
    // Never persist pdfinfo/pdftoppm/exec stderr on the batch row.
    const message =
      err instanceof RasterizeError
        ? teacherFacingErrorMessage(err)
        : code === 'worker_dead'
          ? ERROR_COPY.worker_dead
          : ERROR_COPY.corrupt_pdf;

    await failBatch(supabase, batch.id, code, message, {
      pagesDone: pageRecords.length,
      pageCount: totalPages || null,
      batchPagesDone: batch.pages_done,
      filePlans: filePlans.map((p) => ({ fileId: p.file.id, pages: p.pages })),
      rasterizedIndexes: new Set(pageRecords.map((p) => p.pageIndex)),
    });
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

async function failBatch(
  supabase: SupabaseClient,
  batchId: string,
  code: string,
  message: string,
  opts: {
    pagesDone: number;
    pageCount?: number | null;
    batchPagesDone?: number | null;
    filePlans?: { fileId: string; pages: number }[];
    rasterizedIndexes?: Set<number>;
  },
): Promise<void> {
  // Re-read DB so a pre-listRasterizedPages throw cannot wipe pages_done to 0.
  let rasterizedCount = 0;
  let rasterizedIndexes = opts.rasterizedIndexes ?? new Set<number>();
  try {
    const rows = await listRasterizedPages(supabase, batchId);
    rasterizedCount = rows.length;
    if (!opts.rasterizedIndexes || opts.rasterizedIndexes.size === 0) {
      rasterizedIndexes = new Set(rows.map((r) => r.page_index));
    }
  } catch {
    // Keep opts; resolveFailPagesDone still considers batch.pages_done.
  }

  const pagesDone = resolveFailPagesDone({
    inMemoryCount: opts.pagesDone,
    batchPagesDone: opts.batchPagesDone,
    rasterizedCount,
  });
  const status = batchFailStatus(pagesDone);
  const patch: {
    status: string;
    error_code: string;
    error_message: string;
    pages_done?: number;
    page_count?: number;
  } = {
    status,
    error_code: code,
    error_message: message,
    pages_done: pagesDone,
  };
  if (opts.pageCount != null && opts.pageCount > 0) {
    patch.page_count = opts.pageCount;
  }
  await updateBatchProgress(supabase, batchId, patch);

  // Prefer failed stubs for incomplete indexes; never delete rasterized pages/assets.
  if (status === 'partial' && opts.filePlans && opts.filePlans.length > 0) {
    try {
      await markIncompletePagesFailed(supabase, {
        batchId,
        plans: opts.filePlans,
        rasterizedIndexes,
        errorCode: code,
      });
    } catch {
      // Non-fatal: resume still skips rasterized indexes.
    }
  }
}

/**
 * Teacher-facing batch.error_message for RasterizeError.
 * corrupt_pdf always uses ERROR_COPY (never pdfinfo/pdftoppm stderr).
 * Other known codes prefer ERROR_COPY; keep intentional clean overrides.
 */
export function teacherFacingErrorMessage(err: RasterizeError): string {
  if (err.code === 'corrupt_pdf') return ERROR_COPY.corrupt_pdf;
  if ((Object.values(ERROR_CODES) as string[]).includes(err.code)) {
    const named = ERROR_COPY[err.code as IngestErrorCode];
    // Keep clean overrides (e.g. raster_timeout with page label) when already named-prefix.
    if (err.message.startsWith(named)) return err.message;
    return named;
  }
  return err.message;
}

/** Pure helper for tests: plan page count for a 25×1 PDF. */
export function expectPagesForSinglePdf(pageCount: number, pagesPerStudent: number): {
  pages: number;
  packets: number;
} {
  return {
    pages: pageCount,
    packets: Math.ceil(pageCount / Math.max(1, pagesPerStudent)),
  };
}
