/**
 * Core batch rasterize loop (architecture §7).
 * Never sends class PDF (or any bytes) to a model — ADR-016 / BATCH-12/19.
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
  MAX_PAGES,
  type RasterizeConfig,
} from './config.ts';
import {
  createSignedFileUrl,
  insertAsset,
  listBatchFiles,
  replaceDraftPackets,
  updateBatchProgress,
  updateFilePageCount,
  uploadPhoto,
  upsertIngestPage,
  countTeacherPagesToday,
  listRasterizedPages,
  type BatchRow,
} from './db.ts';
import { streamDownloadToFile, safeUnlink } from './download.ts';
import { RasterizeError } from './errors.ts';
import { normalizePageJpeg } from './jpeg.ts';
import { buildPacketGuess } from './packets.ts';
import { isImageMime, isPdfMime, probePdf, renderPageToJpegFile } from './pdf.ts';

export type PageRecord = {
  id: string;
  pageIndex: number;
  blank: boolean;
};

export async function rasterizeBatch(
  supabase: SupabaseClient,
  batch: BatchRow,
  config: RasterizeConfig = DEFAULT_CONFIG,
): Promise<void> {
  const files = await listBatchFiles(supabase, batch.id);
  if (files.length === 0) {
    await failBatch(supabase, batch.id, 'corrupt_pdf', 'No received files to rasterize.');
    return;
  }

  const dayPages = await countTeacherPagesToday(supabase, batch.teacher_id);
  if (dayPages >= DAY_PAGE_CAP) {
    await failBatch(supabase, batch.id, 'day_page_cap', ERROR_COPY.day_page_cap);
    return;
  }

  const workRoot = await mkdtemp(join(tmpdir(), 'kelyra-raster-'));
  const pageRecords: PageRecord[] = [];
  let globalIndex = 0;

  try {
    // First pass: probe totals (PDF page counts / images=1) before rendering.
    const filePlans: { file: (typeof files)[0]; pages: number; localPath: string }[] = [];
    let totalPages = 0;

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
            await failBatch(supabase, batch.id, err.code, err.message);
            return;
          }
          throw err;
        }
        if (totalPages + info.pages > MAX_PAGES) {
          await failBatch(supabase, batch.id, 'too_many_pages', ERROR_COPY.too_many_pages);
          return;
        }
        totalPages += info.pages;
        await updateFilePageCount(supabase, file.id, info.pages);
        filePlans.push({ file, pages: info.pages, localPath });
      } else if (isImageMime(file.mime_type)) {
        if (totalPages + 1 > MAX_PAGES) {
          await failBatch(supabase, batch.id, 'too_many_pages', ERROR_COPY.too_many_pages);
          return;
        }
        totalPages += 1;
        await updateFilePageCount(supabase, file.id, 1);
        filePlans.push({ file, pages: 1, localPath });
      } else {
        await failBatch(supabase, batch.id, 'unsupported_type', ERROR_COPY.unsupported_type);
        return;
      }
    }

    const already = await listRasterizedPages(supabase, batch.id);
    const alreadyByIndex = new Map(already.map((p) => [p.page_index, p]));
    for (const p of already) {
      pageRecords.push({ id: p.id, pageIndex: p.page_index, blank: p.blank });
    }

    await updateBatchProgress(supabase, batch.id, {
      page_count: totalPages,
      pages_done: already.length,
    });

    if (dayPages + totalPages > DAY_PAGE_CAP) {
      await failBatch(supabase, batch.id, 'day_page_cap', ERROR_COPY.day_page_cap);
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
          continue; // idempotent: already rasterized
        }

        let rawJpeg: Buffer;
        if (isPdfMime(plan.file.mime_type)) {
          const rendered = await renderPageToJpegFile(
            plan.localPath,
            filePage + 1,
            pageDir,
          );
          rawJpeg = await readFile(rendered);
          await safeUnlink(rendered);
        } else {
          rawJpeg = await readFile(plan.localPath);
        }

        const pair = await normalizePageJpeg(rawJpeg, config);
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
    if (err instanceof RasterizeError) {
      await failBatch(supabase, batch.id, err.code, err.message);
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    await failBatch(supabase, batch.id, 'corrupt_pdf', msg);
  } finally {
    await rm(workRoot, { recursive: true, force: true });
  }
}

async function failBatch(
  supabase: SupabaseClient,
  batchId: string,
  code: keyof typeof ERROR_COPY | string,
  message: string,
): Promise<void> {
  await updateBatchProgress(supabase, batchId, {
    status: 'failed',
    error_code: code,
    error_message: message,
  });
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

