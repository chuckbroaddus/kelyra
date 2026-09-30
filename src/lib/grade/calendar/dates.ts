/** Pure date helpers for calendar templates (ISO YYYY-MM-DD, local civil days). */

function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) throw new Error(`expected YYYY-MM-DD, got ${iso}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function toUtcDay(iso: string): number {
  const { y, m, d } = parseIsoDate(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUtcDay(ms: number): string {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function compareIsoDates(a: string, b: string): number {
  return toUtcDay(a) - toUtcDay(b);
}

export function isoInRange(date: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  return compareIsoDates(date, start) >= 0 && compareIsoDates(date, end) <= 0;
}

/** Split [start, end] inclusive into n contiguous day ranges (as even as possible). */
export function splitDateRangeEvenly(
  start: string,
  end: string,
  n: number,
): Array<{ start: string; end: string }> {
  if (!Number.isInteger(n) || n < 1) throw new Error(`n must be positive integer, got ${n}`);
  const startMs = toUtcDay(start);
  const endMs = toUtcDay(end);
  if (endMs < startMs) throw new Error(`end ${end} is before start ${start}`);

  const totalDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
  if (totalDays < n) {
    // Degenerate: clamp each slice to start/end
    return Array.from({ length: n }, () => ({ start, end }));
  }

  const base = Math.floor(totalDays / n);
  const rem = totalDays % n;
  const out: Array<{ start: string; end: string }> = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const len = base + (i < rem ? 1 : 0);
    const sliceStart = startMs + cursor * 86_400_000;
    const sliceEnd = sliceStart + (len - 1) * 86_400_000;
    out.push({ start: fromUtcDay(sliceStart), end: fromUtcDay(sliceEnd) });
    cursor += len;
  }
  return out;
}

/** Inclusive midpoint date of a range (first of two middles when even length). */
export function midpointDate(start: string, end: string): string {
  const startMs = toUtcDay(start);
  const endMs = toUtcDay(end);
  if (endMs < startMs) throw new Error(`end ${end} is before start ${start}`);
  const totalDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
  const midOffset = Math.floor((totalDays - 1) / 2);
  return fromUtcDay(startMs + midOffset * 86_400_000);
}

export function toIsoDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
