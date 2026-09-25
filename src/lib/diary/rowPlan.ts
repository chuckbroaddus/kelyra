/**
 * JOURNAL-INLINE (CEO 2026-09-24): what one Journal list row shows, top to bottom, and
 * exactly how tall it is. The Day List virtualizes with fixed offsets, so every row's
 * height has to be known before it renders — a 60px slot used to clip photos over the
 * title and body. Pure — safe for node tests.
 */
import { splitDiaryBody } from './inlineTokens.ts';
import { diaryBodyUrls, diaryBodyWithoutUrls } from './links.ts';

export type RowPlanMedia = { id: string; kind: string; file_name?: string | null };

export type RowBlock =
  | { kind: 'title'; text: string }
  | { kind: 'text'; text: string; lines: number }
  | { kind: 'photo'; index: number }
  | { kind: 'grid'; indices: number[] }
  | { kind: 'file'; mediaId: string; name: string }
  | { kind: 'link'; url: string }
  | { kind: 'meta'; text: string };

export type RowPlan =
  /** Plain one-liner: bold headline + meta, the classic 60px row. */
  | { compact: true; headline: string; meta: string; height: number }
  | { compact: false; blocks: RowBlock[]; height: number; label: string };

export const ROW_COMPACT_H = 60;
export const ROW_BOTTOM = 8;
export const ROW_PAD_V = 10;
export const ROW_GAP = 6;
export const ROW_TITLE_H = 22;
export const ROW_TEXT_LINE = 20;
export const ROW_META_H = 18;
export const ROW_PHOTO_H = 160;
export const ROW_CHIP_H = 36;
/** Link preview card in a list row: 56px image + 8px padding each side. */
export const ROW_LINK_H = 72;
export const ROW_TILE = 108;
export const ROW_TILE_GAP = 4;
const SEGMENT_MAX_LINES = 4;
const TOTAL_MAX_LINES = 10;
const MAX_LINKS = 3;

export function estimateLines(text: string, charsPerLine: number): number {
  const cpl = Math.max(8, Math.floor(charsPerLine));
  return text.split('\n').reduce((sum, para) => sum + Math.max(1, Math.ceil(para.length / cpl)), 0);
}

export function rowBlockHeight(block: RowBlock): number {
  switch (block.kind) {
    case 'title':
      return ROW_TITLE_H;
    case 'text':
      return block.lines * ROW_TEXT_LINE;
    case 'photo':
      return ROW_PHOTO_H;
    case 'grid': {
      const rows = Math.ceil(Math.min(block.indices.length, 4) / 2);
      return rows * ROW_TILE + (rows - 1) * ROW_TILE_GAP;
    }
    case 'file':
      return ROW_CHIP_H;
    case 'link':
      return ROW_LINK_H;
    case 'meta':
      return ROW_META_H;
  }
}

export function planDiaryRow(input: {
  title?: string | null;
  body: string;
  media: RowPlanMedia[];
  meta: string;
  charsPerLine: number;
}): RowPlan {
  const title = input.title?.trim() ?? '';
  const urls = diaryBodyUrls(input.body);
  const photos = input.media.filter((m) => m.kind === 'photo');
  const files = input.media.filter((m) => m.kind === 'file');
  const segments = splitDiaryBody(input.body);

  const usedPhotos = new Set<number>();
  const usedFiles = new Set<string>();
  const inline: RowBlock[] = [];
  let lineBudget = TOTAL_MAX_LINES;
  const textParts: string[] = [];
  for (const seg of segments) {
    if (seg.kind === 'text') {
      const text = urls.length ? diaryBodyWithoutUrls(seg.text) : seg.text;
      if (!text || lineBudget <= 0) continue;
      textParts.push(text);
      const lines = Math.min(estimateLines(text, input.charsPerLine), SEGMENT_MAX_LINES, lineBudget);
      lineBudget -= lines;
      inline.push({ kind: 'text', text, lines });
    } else if (seg.kind === 'photo') {
      const index = seg.n - 1;
      if (index < 0 || index >= photos.length || usedPhotos.has(index)) continue;
      usedPhotos.add(index);
      inline.push({ kind: 'photo', index });
    } else {
      const want = seg.name.toLowerCase();
      const file = files.find((f) => !usedFiles.has(f.id) && (f.file_name ?? '').trim().toLowerCase() === want);
      if (!file) continue;
      usedFiles.add(file.id);
      inline.push({ kind: 'file', mediaId: file.id, name: file.file_name || 'File' });
    }
  }

  const tail: RowBlock[] = [];
  const leftPhotos = photos.map((_, i) => i).filter((i) => !usedPhotos.has(i));
  if (leftPhotos.length === 1) tail.push({ kind: 'photo', index: leftPhotos[0]! });
  else if (leftPhotos.length > 1) tail.push({ kind: 'grid', indices: leftPhotos });
  for (const f of files) if (!usedFiles.has(f.id)) tail.push({ kind: 'file', mediaId: f.id, name: f.file_name || 'File' });
  for (const url of urls.slice(0, MAX_LINKS)) tail.push({ kind: 'link', url });

  const hasAttachments = inline.some((b) => b.kind !== 'text') || tail.length > 0;
  const textLines = inline.reduce((n, b) => n + (b.kind === 'text' ? b.lines : 0), 0);
  const bodyText = textParts.join(' ');
  if (!hasAttachments && textLines <= 1) {
    const headline = title || bodyText || 'Untitled';
    const meta = [title ? bodyText : '', input.meta].filter(Boolean).join(' · ');
    return { compact: true, headline, meta, height: ROW_COMPACT_H };
  }

  const blocks: RowBlock[] = [];
  if (title) blocks.push({ kind: 'title', text: title });
  blocks.push(...inline, ...tail);
  if (input.meta) blocks.push({ kind: 'meta', text: input.meta });
  const content = blocks.reduce((h, b) => h + rowBlockHeight(b), 0) + ROW_GAP * Math.max(0, blocks.length - 1);
  const height = Math.max(ROW_COMPACT_H, ROW_BOTTOM + ROW_PAD_V * 2 + content);
  return { compact: false, blocks, height, label: title || bodyText || 'Journal entry' };
}
