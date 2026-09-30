/**
 * Quality points, course levels, GPA — SRS §5.9 FR-QP/LVL/GPA, CONTRACT.
 * Pure. F=0 every level. P/F pass omitted from denom; fail counts 0.
 * Cumulative GPA = Σ(points×credits)/Σ(counted credits), never mean of term GPAs.
 */

export type QualityPointMethod = 'letter_map' | 'numeric_band' | 'percent_map';

export type QualityPointRow = {
  letter?: string;
  min_pct?: number;
  max_pct?: number;
  points_by_level: Record<string, number>;
};

export type QualityPointTable = {
  id: string;
  method: QualityPointMethod;
  rows: QualityPointRow[];
  a_plus_points: number;
  unweighted_cap: number;
};

export type CourseLevel = {
  key: string;
  label: string;
  weighted_bonus: number;
  bump_on_d: boolean;
};

export type GpaProfile = {
  key: string;
  table_id: string;
  use_level_bonus: boolean;
  include: {
    pe: boolean;
    pass_fail: boolean;
    local_credit: boolean;
    recovery: boolean;
    below_passing: 'zero' | 'omit';
  };
  repeat: 'include_both' | 'replace' | 'average' | 'forgive_d_f';
};

export type TranscriptRow = {
  id: string;
  student_id: string;
  course_name: string;
  course_code?: string;
  term_code: string;
  pct: number | null;
  letter: string | null;
  credits_attempted: number;
  credits_earned: number;
  level: string;
  pass_fail: boolean;
  flags: string[];
};

/** FR-LVL-01 shipped defaults. */
export const DEFAULT_COURSE_LEVELS: CourseLevel[] = [
  { key: 'regular', label: 'Regular / on-level', weighted_bonus: 0, bump_on_d: true },
  { key: 'honors', label: 'Honors / Pre-AP / Pre-IB / Advanced', weighted_bonus: 0.5, bump_on_d: true },
  { key: 'ap', label: 'AP', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'ib_hl', label: 'IB HL', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'ib_sl', label: 'IB SL', weighted_bonus: 0.5, bump_on_d: true },
  { key: 'dual', label: 'Dual Credit / Dual Enrollment', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'onramps', label: 'OnRamps', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'modified', label: 'Modified / applied', weighted_bonus: -0.5, bump_on_d: true },
  { key: 'local', label: 'Local credit', weighted_bonus: 0, bump_on_d: false },
];

function letterRows(
  entries: Array<[string, Record<string, number>]>,
): QualityPointRow[] {
  return entries.map(([letter, points_by_level]) => ({ letter, points_by_level }));
}

/** Standard 4.0 letter_map with honors/AP columns matching §7.8b. */
export const DEFAULT_QUALITY_TABLES: Record<string, QualityPointTable> = {
  'standard-4': {
    id: 'standard-4',
    method: 'letter_map',
    rows: letterRows([
      ['A+', { regular: 4.0, honors: 4.5, ap: 5.0 }],
      ['A', { regular: 4.0, honors: 4.5, ap: 5.0 }],
      ['A-', { regular: 3.7, honors: 4.2, ap: 4.7 }],
      ['B+', { regular: 3.3, honors: 3.8, ap: 4.3 }],
      ['B', { regular: 3.0, honors: 3.5, ap: 4.0 }],
      ['B-', { regular: 2.7, honors: 3.2, ap: 3.7 }],
      ['C+', { regular: 2.3, honors: 2.8, ap: 3.3 }],
      ['C', { regular: 2.0, honors: 2.5, ap: 3.0 }],
      ['C-', { regular: 1.7, honors: 2.2, ap: 2.7 }],
      ['D+', { regular: 1.3, honors: 1.8, ap: 2.3 }],
      ['D', { regular: 1.0, honors: 1.5, ap: 2.0 }],
      ['D-', { regular: 0.7, honors: 1.2, ap: 1.7 }],
      ['F', { regular: 0, honors: 0, ap: 0 }],
    ]),
    a_plus_points: 4.0,
    unweighted_cap: 4.0,
  },
  'tx-4': {
    id: 'tx-4',
    method: 'letter_map',
    rows: letterRows([
      ['A', { regular: 4.0, honors: 4.5, ap: 5.0 }],
      ['B', { regular: 3.0, honors: 3.5, ap: 4.0 }],
      ['C', { regular: 2.0, honors: 2.5, ap: 3.0 }],
      ['D', { regular: 1.0, honors: 1.5, ap: 2.0 }],
      ['F', { regular: 0, honors: 0, ap: 0 }],
    ]),
    a_plus_points: 4.0,
    unweighted_cap: 4.0,
  },
};

/** FR-GPA-08 default transfer letter → percent map. */
export const DEFAULT_TRANSFER_PCT: Record<string, number> = {
  'A+': 98,
  A: 95,
  'A-': 92,
  'B+': 88,
  B: 85,
  'B-': 82,
  'C+': 78,
  C: 75,
  'C-': 72,
  'D+': 68,
  D: 65,
  'D-': 62,
  F: 55,
};

export function getCourseLevel(
  key: string,
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): CourseLevel {
  return (
    levels.find((l) => l.key === key) ??
    levels.find((l) => l.key === 'regular') ?? {
      key: 'regular',
      label: 'Regular / on-level',
      weighted_bonus: 0,
      bump_on_d: true,
    }
  );
}

function normLetter(letter: string | null | undefined): string {
  return (letter ?? '').trim().toUpperCase().replace('−', '-');
}

function isFailLetter(letter: string): boolean {
  return letter === 'F' || letter === 'U' || letter === 'NC' || letter === 'WF';
}

function isPassPfLetter(letter: string): boolean {
  return letter === 'P' || letter === 'S' || letter === 'CR';
}

function findRow(
  table: QualityPointTable,
  grade: { letter?: string | null; pct?: number | null },
): QualityPointRow | undefined {
  const L = normLetter(grade.letter);
  if (table.method === 'letter_map' || L) {
    const byLetter = table.rows.find((r) => r.letter && normLetter(r.letter) === L);
    if (byLetter) return byLetter;
  }
  if (
    grade.pct != null &&
    Number.isFinite(grade.pct) &&
    (table.method === 'numeric_band' || table.method === 'percent_map')
  ) {
    const p = grade.pct;
    return table.rows.find(
      (r) => r.min_pct != null && r.max_pct != null && p >= r.min_pct! && p <= r.max_pct!,
    );
  }
  return undefined;
}

/**
 * Quality points for one grade. Unweighted uses the regular column (capped).
 * Weighted uses points_by_level[level], or regular + CourseLevel.weighted_bonus.
 * F is 0 at every level when the table awards 0 (FR-LVL-03).
 */
export function qualityPoints(
  table: QualityPointTable,
  levelKey: string,
  grade: { letter?: string | null; pct?: number | null },
  profile?: Partial<GpaProfile>,
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): number {
  const L = normLetter(grade.letter);
  const row = findRow(table, grade);
  if (!row) {
    if (isFailLetter(L)) return 0;
    return 0;
  }

  const explicitF = row.points_by_level[levelKey] ?? row.points_by_level.regular;
  if (isFailLetter(L) && (explicitF == null || explicitF === 0)) return 0;
  if (isFailLetter(L) && explicitF === 0) return 0;
  // Default F=0 even if level column missing
  if (isFailLetter(L) && row.letter && normLetter(row.letter) === 'F') {
    const fPts = row.points_by_level[levelKey] ?? row.points_by_level.regular ?? 0;
    return fPts;
  }

  const weighted = profile?.use_level_bonus === true;
  const levelInfo = getCourseLevel(levelKey, levels);
  let pts: number;

  if (!weighted) {
    pts = row.points_by_level.regular ?? 0;
    if (L === 'A+') pts = Math.min(pts, table.a_plus_points);
    pts = Math.min(pts, table.unweighted_cap);
  } else if (row.points_by_level[levelKey] != null) {
    pts = row.points_by_level[levelKey]!;
  } else {
    const base = row.points_by_level.regular ?? 0;
    const isD = L.startsWith('D');
    if (isFailLetter(L)) {
      pts = 0;
    } else if (isD && !levelInfo.bump_on_d) {
      pts = base;
    } else {
      pts = base + levelInfo.weighted_bonus;
    }
  }

  if (isFailLetter(L) && (row.points_by_level.regular ?? 0) === 0) {
    // FR-LVL-03: F stays 0 at every level when table awards 0
    return 0;
  }
  return pts;
}

function rowFlags(r: TranscriptRow): Set<string> {
  return new Set((r.flags ?? []).map((f) => f.toLowerCase()));
}

function shouldIncludeRow(r: TranscriptRow, profile: GpaProfile): 'omit' | 'pf_pass' | 'count' {
  const flags = rowFlags(r);
  if (flags.has('pe') && !profile.include.pe) return 'omit';
  if ((flags.has('local') || flags.has('local_credit') || r.level === 'local') && !profile.include.local_credit) {
    return 'omit';
  }
  if (flags.has('recovery') && !profile.include.recovery) return 'omit';

  const L = normLetter(r.letter);
  if (r.pass_fail) {
    if (isPassPfLetter(L) || (r.credits_earned > 0 && !isFailLetter(L))) {
      // FR-GPA-05: pass omitted from both denominators
      return 'pf_pass';
    }
    // fail on P/F → count as 0 in denom
    return 'count';
  }
  if (isFailLetter(L) || (r.pct != null && r.credits_earned === 0 && L === 'F')) {
    if (profile.include.below_passing === 'omit') return 'omit';
  }
  return 'count';
}

function applyRepeat(
  rows: TranscriptRow[],
  rule: GpaProfile['repeat'],
): TranscriptRow[] {
  if (rule === 'include_both' || rows.length === 0) return rows;

  const keyOf = (r: TranscriptRow) =>
    (r.course_code || r.course_name).trim().toLowerCase();

  if (rule === 'replace') {
    const best = new Map<string, TranscriptRow>();
    for (const r of rows) {
      const k = keyOf(r);
      const prev = best.get(k);
      if (!prev) {
        best.set(k, r);
        continue;
      }
      const prevPts = prev.pct ?? letterRank(prev.letter);
      const nextPts = r.pct ?? letterRank(r.letter);
      best.set(k, nextPts >= prevPts ? r : prev);
    }
    return [...best.values()];
  }

  if (rule === 'forgive_d_f') {
    const byCourse = new Map<string, TranscriptRow[]>();
    for (const r of rows) {
      const k = keyOf(r);
      const list = byCourse.get(k) ?? [];
      list.push(r);
      byCourse.set(k, list);
    }
    const out: TranscriptRow[] = [];
    for (const list of byCourse.values()) {
      if (list.length === 1) {
        out.push(list[0]!);
        continue;
      }
      const hasRetakePass = list.some((r) => {
        const L = normLetter(r.letter);
        return !isFailLetter(L) && !L.startsWith('D');
      });
      for (const r of list) {
        const L = normLetter(r.letter);
        if (hasRetakePass && (isFailLetter(L) || L.startsWith('D'))) continue;
        out.push(r);
      }
    }
    return out;
  }

  if (rule === 'average') {
    const byCourse = new Map<string, TranscriptRow[]>();
    for (const r of rows) {
      const k = keyOf(r);
      const list = byCourse.get(k) ?? [];
      list.push(r);
      byCourse.set(k, list);
    }
    // average is applied at gpa() via synthetic rows — return as-is tagged; handle in gpa
    return rows;
  }
  return rows;
}

function letterRank(letter: string | null): number {
  const L = normLetter(letter);
  const map: Record<string, number> = {
    'A+': 12, A: 11, 'A-': 10,
    'B+': 9, B: 8, 'B-': 7,
    'C+': 6, C: 5, 'C-': 4,
    'D+': 3, D: 2, 'D-': 1, F: 0,
  };
  return map[L] ?? -1;
}

/**
 * Σ(quality_points × credits) / Σ(credits that count).
 * Never averages term GPAs (FR-GPA-02).
 */
export function gpa(
  rows: TranscriptRow[],
  profile: GpaProfile,
  tables: Record<string, QualityPointTable>,
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): number {
  const table = tables[profile.table_id] ?? Object.values(tables)[0];
  if (!table) return 0;

  let working = applyRepeat(rows, profile.repeat);

  if (profile.repeat === 'average') {
    const keyOf = (r: TranscriptRow) =>
      (r.course_code || r.course_name).trim().toLowerCase();
    const groups = new Map<string, TranscriptRow[]>();
    for (const r of working) {
      const k = keyOf(r);
      const list = groups.get(k) ?? [];
      list.push(r);
      groups.set(k, list);
    }
    const collapsed: TranscriptRow[] = [];
    for (const list of groups.values()) {
      if (list.length === 1) {
        collapsed.push(list[0]!);
        continue;
      }
      const pts = list.map((r) =>
        qualityPoints(table, r.level, { letter: r.letter, pct: r.pct }, profile, levels),
      );
      const avg = pts.reduce((a, b) => a + b, 0) / pts.length;
      const head = list[list.length - 1]!;
      collapsed.push({
        ...head,
        // encode averaged points via a synthetic percent path using letter_map bypass
        letter: head.letter,
        pct: avg, // stashed; see average branch below
        flags: [...(head.flags ?? []), '__avg_points'],
      });
      // store avg on a side channel via credits — use custom: keep letter for display
      (collapsed[collapsed.length - 1] as TranscriptRow & { __avg?: number }).__avg = avg;
    }
    working = collapsed;
  }

  let totalPoints = 0;
  let totalCredits = 0;

  for (const r of working) {
    const mode = shouldIncludeRow(r, profile);
    if (mode === 'omit' || mode === 'pf_pass') continue;

    const credits = r.credits_attempted;
    if (!(credits > 0)) continue;

    const flags = rowFlags(r);
    let pts: number;
    if (flags.has('__avg_points') && typeof (r as { __avg?: number }).__avg === 'number') {
      pts = (r as { __avg?: number }).__avg!;
    } else if (r.pass_fail && isFailLetter(normLetter(r.letter))) {
      pts = 0;
    } else {
      pts = qualityPoints(
        table,
        r.level,
        { letter: r.letter, pct: r.pct },
        profile,
        levels,
      );
    }

    // F never gets level bump
    if (isFailLetter(normLetter(r.letter))) pts = 0;

    totalPoints += pts * credits;
    totalCredits += credits;
  }

  if (totalCredits === 0) return 0;
  return totalPoints / totalCredits;
}

export function transferLetterToPct(letter: string): number {
  const key = letter.trim().toUpperCase().replace('−', '-');
  return DEFAULT_TRANSFER_PCT[key] ?? 55;
}
