/**
 * Answer-key page signatures + match-key scoring (shared by Edge and ai:dev).
 * A signature is an 8x8 mean-threshold hash (phash) plus the 64 grey cell means (layout),
 * computed from a 32x32 greyscale thumbnail. Runtime-specific decoding lives elsewhere
 * (ai:dev: sharp; Edge: pageSignatureEdge.ts).
 */

// deno-lint-ignore no-explicit-any
type Json = any;

export type PageSignature = { phash: string; layout: number[]; header: string };
export const EMPTY_SIGNATURE: PageSignature = { phash: '', layout: [], header: '' };

/** 32x32 greyscale bytes (row-major, 0-255) → signature. */
export function signatureFromGrey32(data: ArrayLike<number>, width = 32): PageSignature {
  const cells: number[] = [];
  for (let gy = 0; gy < 8; gy += 1) {
    for (let gx = 0; gx < 8; gx += 1) {
      let sum = 0;
      let count = 0;
      for (let y = gy * 4; y < gy * 4 + 4; y += 1) {
        for (let x = gx * 4; x < gx * 4 + 4; x += 1) {
          sum += Number(data[y * width + x] ?? 0);
          count += 1;
        }
      }
      cells.push(count ? sum / count / 255 : 0);
    }
  }
  const mean = cells.reduce((a, b) => a + b, 0) / cells.length;
  let bits = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (cells[i]! >= mean) bits |= 1n << BigInt(63 - i);
  }
  return { phash: bits.toString(16).padStart(16, '0'), layout: cells, header: '' };
}

export function hammingHex(a: string, b: string): number {
  let xor = BigInt(`0x${a || '0'}`) ^ BigInt(`0x${b || '0'}`);
  let count = 0;
  while (xor) {
    xor &= xor - 1n;
    count += 1;
  }
  return count;
}

export function meanAbsDiff(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (!n) return 1;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const left = Number.isFinite(a[i]) ? a[i]! : 0;
    const right = Number.isFinite(b[i]) ? b[i]! : 0;
    sum += Math.abs(left - right);
  }
  return sum / n;
}

export function tokenOverlap(a: string, b: string): number {
  const left = new Set(String(a).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  const right = new Set(String(b).toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const token of left) if (right.has(token)) hit += 1;
  return hit / Math.max(left.size, right.size);
}

export type ScoredKey = {
  id: string;
  title: string;
  score: number;
  hashScore: number;
  layoutScore: number;
  headerScore: number;
  imageUrl: string | null;
};

export function scoreKeyCandidates(keys: Json[], probe: PageSignature): ScoredKey[] {
  return keys
    .map((row) => {
      const id = String(row?.id ?? '');
      const title = String(row?.title ?? '');
      const phash = typeof row?.phash === 'string' ? row.phash : '';
      const layout: number[] = Array.isArray(row?.layout) ? row.layout.map((n: unknown) => Number(n)) : [];
      const header = String(row?.header ?? '');
      const hashScore = phash && probe.phash ? 1 - hammingHex(phash, probe.phash) / 64 : 0;
      const layoutScore = layout.length && probe.layout.length ? 1 - meanAbsDiff(layout, probe.layout) : 0;
      const headerScore = tokenOverlap(header, probe.header);
      const score = hashScore * 0.45 + layoutScore * 0.35 + headerScore * 0.2;
      return { id, title, score, hashScore, layoutScore, headerScore, imageUrl: row?.imageUrl ?? null };
    })
    .filter((row) => row.id)
    .sort((a, b) => b.score - a.score);
}

export type MatchKeyResult = { assignmentId: string | null; confidence: number; scores: ScoredKey[] };

/**
 * Hash-only decision. Returns a final result, or the shortlist that needs a vision tiebreak.
 */
export function planKeyMatch(
  keys: Json[],
  probe: PageSignature,
): { result: MatchKeyResult } | { shortlist: ScoredKey[]; best: ScoredKey; scores: ScoredKey[] } {
  const scored = scoreKeyCandidates(keys, probe);
  if (!scored.length) return { result: { assignmentId: null, confidence: 0, scores: [] } };
  const best = scored[0]!;
  const second = scored[1];
  const lead = second ? best.score - second.score : best.score;
  const scores = scored.slice(0, 4);
  if (best.score >= 0.62 && lead >= 0.08) {
    return { result: { assignmentId: best.id, confidence: best.score, scores } };
  }
  const shortlist = scored.filter((row) => row.score >= 0.42).slice(0, 3);
  if (!shortlist.length) return { result: { assignmentId: null, confidence: best.score, scores } };
  return { shortlist, best, scores };
}

/** When no shortlisted key has a usable photo, fall back to the hash score alone. */
export function hashOnlyKeyMatch(best: ScoredKey, scores: ScoredKey[]): MatchKeyResult {
  return { assignmentId: best.score >= 0.55 ? best.id : null, confidence: best.score, scores };
}

export function matchKeyCandidateText(rows: Array<{ id: string; title: string }>): string {
  return rows.map((row) => `${row.id} — ${row.title}`).join('\n');
}

export function finalizeKeyPick(
  parsed: Json,
  allowedIds: string[],
  best: ScoredKey,
  scores: ScoredKey[],
): MatchKeyResult {
  const allowed = new Set(allowedIds);
  const picked =
    typeof parsed?.assignmentId === 'string' && allowed.has(parsed.assignmentId) ? parsed.assignmentId : null;
  const confidence =
    typeof parsed?.confidence === 'number' ? parsed.confidence : picked ? Math.max(best.score, 0.7) : 0;
  return { assignmentId: picked, confidence, scores };
}
