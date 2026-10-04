/**
 * extract-roster post-processing (shared by Edge extract-roster and ai:dev).
 * Model JSON → cleaned names: junk lines dropped, LAST, FIRST flipped, row-index "#"
 * columns never treated as student IDs, low_confidence when the read is shaky.
 */

// deno-lint-ignore no-explicit-any
type Json = any;

export type RosterRow = {
  name: string;
  student_id: string | null;
  grade: string | null;
  period: string | null;
  parent_contact: string | null;
  confident: boolean;
};

export type RosterResult = {
  document_kind_guess: string;
  rejected: boolean;
  low_confidence: boolean;
  names: RosterRow[];
};

/** A run of small sequential integers (1,2,3…) in student_id is the "#" row column, not an ID. */
export function dropRowIndexIds<T extends { student_id: string | null }>(rows: T[]): T[] {
  const ids = rows.map((r) => r.student_id).filter((v) => v != null);
  if (ids.length < 2) {
    for (const r of rows) if (r.student_id != null && /^#?\s*\d{1,2}\.?$/.test(String(r.student_id))) r.student_id = null;
    return rows;
  }
  const nums = ids
    .map((v) => (/^#?\s*(\d{1,3})\.?$/.exec(String(v).trim()) || [])[1])
    .map((v) => (v == null ? NaN : Number(v)));
  const allSmall = nums.every((n) => Number.isFinite(n) && n <= 200);
  const sequential = allSmall && nums.every((n, i) => i === 0 || n === nums[i - 1]! + 1);
  if (allSmall && Math.min(...nums) <= 2 && (sequential || Math.max(...nums) <= rows.length + 1)) {
    for (const r of rows) r.student_id = null;
  }
  return rows;
}

export function isJunkRosterName(name: unknown): boolean {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  if (n.length < 2) return true;
  const lower = n.toLowerCase();
  if (
    /^(present|absent|tardy|excused|name|student|students|roster|period|room|date|total|page|class|section|grade|id|sid|teacher|homeroom|advisory)\b/i.test(
      lower,
    )
  ) {
    return true;
  }
  if (/^period\s*\d+/i.test(n)) return true;
  if (/^room\s*\d+/i.test(n)) return true;
  if (/^(mr|ms|mrs|dr|sra|sr|coach)\.?\s+/i.test(n) && n.split(/\s+/).length <= 3) return true;
  if (/^page\s*\d+(\s+of\s+\d+)?$/i.test(n)) return true;
  // Masked / smudged OCR (symbols, digits) is never a real name.
  if (/[#?*_\[\]{}<>|\\\/0-9@]/.test(n)) return true;
  if (/^(continued|cut|smudged|illegible|unknown|n\/a)\b/i.test(lower)) return true;
  if (/^(page|total|totals|continued)\b/i.test(lower) && n.split(/\s+/).length <= 2) return true;
  return false;
}

function titleCaseName(s: string): string {
  return String(s || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function flipLastFirst(name: unknown): string {
  const raw = String(name || '').replace(/\s+/g, ' ').trim();
  const m = raw.match(/^([A-Za-z][A-Za-z\-']+),\s*([A-Za-z][A-Za-z\-']+(?:\s+[A-Za-z][A-Za-z\-']+)?)$/);
  if (m) return titleCaseName(`${m[2]} ${m[1]}`);
  if (/^[A-Z][A-Z\-']+\s+[A-Z][A-Z\-']+$/.test(raw) && raw === raw.toUpperCase()) {
    const [a, b] = raw.split(/\s+/);
    return titleCaseName(`${b} ${a}`);
  }
  return titleCaseName(raw);
}

function emptyToNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined' || s === '-' || s === '—') return null;
  return s;
}

export function finalizeRosterExtract(parsed: Json): RosterResult {
  const rejected =
    parsed?.rejected === true ||
    parsed?.document_kind_guess === 'not_roster' ||
    /not_roster|not a roster|not a (class )?list/i.test(String(parsed?.warning || ''));

  const names: RosterRow[] = rejected
    ? []
    : Array.isArray(parsed?.names)
      ? (parsed.names as Json[])
          .map((row): RosterRow | null => {
            const rawName = String(row?.name ?? '').replace(/\s+/g, ' ').trim();
            if (!rawName || isJunkRosterName(rawName)) return null;
            const name = flipLastFirst(rawName);
            if (isJunkRosterName(name)) return null;
            return {
              name,
              student_id: emptyToNull(
                emptyToNull(row?.student_id ?? row?.studentId ?? row?.sid)?.replace(/^#\s*/, ''),
              ),
              grade: emptyToNull(row?.grade ?? row?.grade_level),
              period: emptyToNull(row?.period),
              parent_contact: emptyToNull(row?.parent_contact ?? row?.parentContact),
              confident:
                row?.confident !== false &&
                name.split(/\s+/).length >= 2 &&
                // Initial-only surname ("Sam K") = partial row.
                !/\s[A-Za-z]\.?$/.test(name),
            };
          })
          .filter((row): row is RosterRow => Boolean(row))
          .filter((row, idx, arr) => arr.findIndex((x) => x.name.toLowerCase() === row.name.toLowerCase()) === idx)
          .slice(0, 40)
      : [];
  dropRowIndexIds(names);

  return {
    document_kind_guess: rejected
      ? 'not_roster'
      : parsed?.document_kind_guess || (names.length ? 'class_roster' : 'not_roster'),
    rejected: rejected || (names.length === 0 && parsed?.document_kind_guess === 'not_roster'),
    // Client starts every suggestion unchecked when the read is shaky (rough phone photo).
    low_confidence:
      names.length > 0 && names.filter((row) => row.confident === false).length / names.length >= 0.4,
    names,
  };
}
