/**
 * JOURNAL-INLINE (CEO 2026-09-24): photos and files added from the Body "+" leave a
 * readable marker at the cursor — `[Photo 2]`, `[File: syllabus.pdf]` — so the saved
 * body keeps their place in the text (no schema change). Journal list rows swap each
 * marker for the real thumbnail or file chip. Pure — safe for node tests.
 */
export type DiaryBodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'photo'; n: number }
  | { kind: 'file'; name: string };

const TOKEN = /\[(?:Photo (\d{1,3})|File: ([^\]\n]{1,200}))\]/g;
const PHOTO_TOKEN = /\[Photo (\d{1,3})\]/g;

export function photoToken(n: number): string {
  return `[Photo ${n}]`;
}

export function fileToken(name: string): string {
  const clean = name.replace(/[[\]\n]/g, ' ').replace(/\s+/g, ' ').trim() || 'file';
  return `[File: ${clean}]`;
}

/** Body split at markers, in order. Empty text between markers is dropped. */
export function splitDiaryBody(body: string): DiaryBodySegment[] {
  const out: DiaryBodySegment[] = [];
  let last = 0;
  const pushText = (raw: string) => {
    const text = raw.replace(/^\s*\n/, '').replace(/\n\s*$/, '').trim();
    if (text) out.push({ kind: 'text', text });
  };
  for (const m of body.matchAll(TOKEN)) {
    pushText(body.slice(last, m.index));
    if (m[1]) out.push({ kind: 'photo', n: Number(m[1]) });
    else out.push({ kind: 'file', name: m[2]!.trim() });
    last = m.index! + m[0].length;
  }
  pushText(body.slice(last));
  return out;
}

/** Body with every marker removed (search, previews, accessibility labels). */
export function diaryBodyWithoutTokens(body: string): string {
  return body
    .replace(TOKEN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Insert `token` at the selection, on its own line, and return the new body plus the
 * cursor position just after the marker. A missing/stale selection appends at the end.
 */
export function insertTokenAt(
  body: string,
  selection: { start: number; end: number } | null | undefined,
  token: string,
): { body: string; cursor: number } {
  const len = body.length;
  let start = selection ? Math.max(0, Math.min(selection.start, len)) : len;
  let end = selection ? Math.max(start, Math.min(selection.end, len)) : len;
  if (Number.isNaN(start) || Number.isNaN(end)) start = end = len;
  const before = body.slice(0, start);
  const after = body.slice(end);
  const lead = before.length && !before.endsWith('\n') ? '\n' : '';
  const trail = after.length && !after.startsWith('\n') ? '\n' : '';
  const next = `${before}${lead}${token}${trail}${after}`;
  return { body: next, cursor: before.length + lead.length + token.length + trail.length };
}

/** Remove the first occurrence of `token` and one line break it sat on. */
export function removeToken(body: string, token: string): string {
  const at = body.indexOf(token);
  if (at < 0) return body;
  let start = at;
  let end = at + token.length;
  if (body[end] === '\n') end += 1;
  else if (start > 0 && body[start - 1] === '\n') start -= 1;
  return body.slice(0, start) + body.slice(end);
}

/** Next free photo number: past both existing photos and any marker already in the body. */
export function nextPhotoNumber(body: string, existingPhotos: number): number {
  let max = existingPhotos;
  for (const m of body.matchAll(PHOTO_TOKEN)) max = Math.max(max, Number(m[1]));
  return max + 1;
}

/**
 * On save, staged photos upload in order after `existingPhotos` saved ones, so the k-th
 * staged photo becomes photo `existingPhotos + k`. Rewrite each staged marker to that
 * final number (markers of removed photos were already taken out).
 */
export function renumberStagedPhotoTokens(
  body: string,
  stagedNumbers: number[],
  existingPhotos: number,
): string {
  const map = new Map<number, number>();
  stagedNumbers.forEach((n, k) => map.set(n, existingPhotos + k + 1));
  return body.replace(PHOTO_TOKEN, (whole, n: string) => {
    const final = map.get(Number(n));
    return final ? photoToken(final) : whole;
  });
}
