/**
 * Quality points, course levels, GPA — SRS §5.9 FR-QP/LVL/GPA, CONTRACT.
 * Pure. F=0 every level. P/F pass omitted from denom; fail counts 0.
 * Cumulative GPA = Σ(points×credits)/Σ(counted credits), never mean of term GPAs.
 * GB-16: numeric_band 6.0, expanded levels, include flags, repeat, rank_6.
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
  name?: string;
  method: QualityPointMethod;
  rows: QualityPointRow[];
  a_plus_points: number;
  unweighted_cap: number;
  /** When true, F stays 0 even if a band awards remainder (FR-LVL-03 default). */
  bump_on_fail?: boolean;
};

export type CourseLevel = {
  key: string;
  label: string;
  weighted_bonus: number;
  bump_on_d: boolean;
  /** Optional numeric-band column key (defaults to key). */
  band_column?: string;
};

/** Profile inclusion rules (FR-GPA-03). Missing keys default to include=true (today). */
export type GpaInclude = {
  pe: boolean;
  athletics: boolean;
  aide: boolean;
  pass_fail: boolean;
  local_credit: boolean;
  recovery: boolean;
  cbe: boolean;
  pre9: boolean;
  below_passing: 'zero' | 'omit';
};

export type GpaRepeatRule = 'include_both' | 'replace' | 'average' | 'forgive_d_f';

/** Canonical profile ids §6.3; legacy unweighted|weighted still accepted. */
export type GpaProfileKey =
  | 'unweighted_4'
  | 'weighted_5'
  | 'rank_6'
  | 'eligibility'
  | 'unweighted'
  | 'weighted';

export type GpaProfile = {
  key: GpaProfileKey | string;
  table_id: string;
  use_level_bonus: boolean;
  /** Partial OK — missing flags default to include (today's behavior). */
  include: Partial<GpaInclude> & {
    pe?: boolean;
    pass_fail?: boolean;
    local_credit?: boolean;
    recovery?: boolean;
    below_passing?: 'zero' | 'omit';
  };
  repeat: GpaRepeatRule;
  cap?: number | null;
  credit_field?: 'attempted' | 'earned';
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
  /** Optional precomputed include flags (SRS §6.7). */
  include_unweighted?: boolean | null;
  include_weighted?: boolean | null;
  include_rank?: boolean | null;
};

export type RowIncludeFlags = {
  include_unweighted: boolean;
  include_weighted: boolean;
  include_rank: boolean;
};

/** FR-LVL-01 shipped defaults (+ preap, dual_credit keys). */
export const DEFAULT_COURSE_LEVELS: CourseLevel[] = [
  { key: 'regular', label: 'Regular / on-level', weighted_bonus: 0, bump_on_d: true },
  { key: 'honors', label: 'Honors / Advanced', weighted_bonus: 0.5, bump_on_d: true },
  { key: 'preap', label: 'Pre-AP / Pre-IB', weighted_bonus: 0.5, bump_on_d: true },
  { key: 'ap', label: 'AP', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'ib_hl', label: 'IB HL', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'ib_sl', label: 'IB SL', weighted_bonus: 0.5, bump_on_d: true },
  { key: 'dual_credit', label: 'Dual Credit / Dual Enrollment', weighted_bonus: 1.0, bump_on_d: true },
  /** Legacy alias kept so existing rows with level=dual still resolve. */
  { key: 'dual', label: 'Dual Credit / Dual Enrollment', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'onramps', label: 'OnRamps', weighted_bonus: 1.0, bump_on_d: true },
  { key: 'modified', label: 'Modified / applied', weighted_bonus: -0.5, bump_on_d: true },
  { key: 'local', label: 'Local credit', weighted_bonus: 0, bump_on_d: false },
];

/** Catalog picker order — dual alias hidden. */
export const COURSE_LEVEL_PICKER_KEYS = [
  'regular',
  'honors',
  'preap',
  'ap',
  'ib_hl',
  'ib_sl',
  'dual_credit',
  'onramps',
  'modified',
  'local',
] as const;

export function courseLevelPickerOptions(
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): CourseLevel[] {
  const byKey = new Map(levels.map((l) => [l.key, l]));
  return COURSE_LEVEL_PICKER_KEYS.map(
    (k) =>
      byKey.get(k) ?? {
        key: k,
        label: k,
        weighted_bonus: 0,
        bump_on_d: true,
      },
  );
}

function letterRows(
  entries: Array<[string, Record<string, number>]>,
): QualityPointRow[] {
  return entries.map(([letter, points_by_level]) => ({ letter, points_by_level }));
}

/** Texas-style 4/5/6 numeric bands (regular / honors / ap columns). */
function texasNumericBandRows(): QualityPointRow[] {
  // 3-pt steps from 100 down; F/0 band at bottom. Typical 6.0 district chart.
  const bands: Array<[number, number, number, number, number]> = [
    [97, 100, 4.0, 5.0, 6.0],
    [94, 96.9999, 3.8, 4.8, 5.8],
    [90, 93.9999, 3.6, 4.6, 5.6],
    [87, 89.9999, 3.4, 4.4, 5.4],
    [84, 86.9999, 3.2, 4.2, 5.2],
    [80, 83.9999, 3.0, 4.0, 5.0],
    [77, 79.9999, 2.8, 3.8, 4.8],
    [74, 76.9999, 2.6, 3.6, 4.6],
    [70, 73.9999, 2.4, 3.4, 4.4],
    [67, 69.9999, 2.2, 3.2, 4.2],
    [64, 66.9999, 2.0, 3.0, 4.0],
    [60, 63.9999, 1.6, 2.6, 3.6],
    [0, 59.9999, 0, 0, 0],
  ];
  return bands.map(([min_pct, max_pct, r, h, a]) => ({
    min_pct,
    max_pct,
    points_by_level: {
      regular: r,
      honors: h,
      preap: h,
      ap: a,
      ib_hl: a,
      ib_sl: h,
      dual_credit: a,
      dual: a,
      onramps: a,
      modified: Math.max(0, r - 0.5),
      local: r,
    },
  }));
}

/** Standard 4.0 letter_map with honors/AP columns matching §7.8b. */
export const DEFAULT_QUALITY_TABLES: Record<string, QualityPointTable> = {
  'standard-4': {
    id: 'standard-4',
    name: 'Standard 4.0 letter map',
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
    name: 'Texas letter 4.0/5.0',
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
  'tx-6-numeric': {
    id: 'tx-6-numeric',
    name: 'Texas 6.0 numeric band',
    method: 'numeric_band',
    rows: texasNumericBandRows(),
    a_plus_points: 4.0,
    unweighted_cap: 4.0,
    bump_on_fail: false,
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

export function defaultInclude(over: Partial<GpaInclude> = {}): GpaInclude {
  return {
    pe: true,
    athletics: true,
    aide: true,
    pass_fail: true,
    local_credit: true,
    recovery: true,
    cbe: true,
    pre9: true,
    below_passing: 'zero',
    ...over,
  };
}

/** Default profiles. Rank off unless mode asks for it. */
export function defaultGpaProfileSet(opts?: {
  mode?: 'off' | 'unweighted' | 'unweighted_and_weighted' | 'with_rank';
  letterTableId?: string;
  rankTableId?: string;
}): GpaProfile[] {
  const mode = opts?.mode ?? 'unweighted_and_weighted';
  if (mode === 'off') return [];
  const letterId = opts?.letterTableId ?? 'tx-4';
  const rankId = opts?.rankTableId ?? 'tx-6-numeric';
  const uw: GpaProfile = {
    key: 'unweighted_4',
    table_id: letterId,
    use_level_bonus: false,
    include: defaultInclude({ local_credit: false }),
    repeat: 'include_both',
  };
  if (mode === 'unweighted') return [uw];
  const w: GpaProfile = {
    ...uw,
    key: 'weighted_5',
    use_level_bonus: true,
    include: defaultInclude({ pe: false, athletics: false, local_credit: false }),
  };
  if (mode === 'unweighted_and_weighted') return [uw, w];
  const rank: GpaProfile = {
    key: 'rank_6',
    table_id: rankId,
    use_level_bonus: true,
    include: defaultInclude({
      pe: false,
      athletics: false,
      aide: false,
      local_credit: false,
      recovery: false,
      cbe: false,
      pre9: false,
      pass_fail: true,
      below_passing: 'zero',
    }),
    repeat: 'replace',
  };
  return [uw, w, rank];
}

export function getCourseLevel(
  key: string,
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): CourseLevel {
  const k = key === 'dual' ? 'dual' : key === 'dual_credit' ? 'dual_credit' : key;
  return (
    levels.find((l) => l.key === k) ??
    levels.find((l) => l.key === 'dual_credit' && (key === 'dual' || key === 'dual_credit')) ??
    levels.find((l) => l.key === 'dual' && (key === 'dual' || key === 'dual_credit')) ??
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

function isDLetter(letter: string): boolean {
  return letter.startsWith('D');
}

function normalizeLevelKey(levelKey: string): string {
  if (levelKey === 'dual') return 'dual_credit';
  return levelKey;
}

function bandColumnFor(levelKey: string, levels: CourseLevel[]): string {
  const info = getCourseLevel(levelKey, levels);
  if (info.band_column) return info.band_column;
  const k = normalizeLevelKey(levelKey);
  if (k === 'dual_credit') return 'dual_credit';
  return k;
}

function findRow(
  table: QualityPointTable,
  grade: { letter?: string | null; pct?: number | null },
): QualityPointRow | undefined {
  const L = normLetter(grade.letter);
  if (table.method === 'letter_map' || (L && table.method !== 'numeric_band' && table.method !== 'percent_map')) {
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
  // numeric_band may still resolve letter when pct missing
  if (L && table.method === 'letter_map') {
    return table.rows.find((r) => r.letter && normLetter(r.letter) === L);
  }
  return undefined;
}

/**
 * Build numeric_band rows from a chart of {min,max, points by level}.
 * FR-AI acceptance 6: keep full table rows, never collapse to +1.0 guess.
 */
export function numericBandRowsFromChart(
  chart: Array<{
    min_pct: number;
    max_pct: number;
    points_by_level: Record<string, number>;
  }>,
): QualityPointRow[] {
  return chart.map((r) => ({
    min_pct: r.min_pct,
    max_pct: r.max_pct,
    points_by_level: { ...r.points_by_level },
  }));
}

export function makeNumericBandTable(
  id: string,
  chart: Array<{ min_pct: number; max_pct: number; points_by_level: Record<string, number> }>,
  name = 'Numeric band',
): QualityPointTable {
  return {
    id,
    name,
    method: 'numeric_band',
    rows: numericBandRowsFromChart(chart),
    a_plus_points: 4.0,
    unweighted_cap: 4.0,
    bump_on_fail: false,
  };
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

  if (isFailLetter(L)) {
    const fPts = row.points_by_level[bandColumnFor(levelKey, levels)]
      ?? row.points_by_level.regular
      ?? 0;
    if (table.bump_on_fail === true) return fPts;
    return 0;
  }

  const weighted = profile?.use_level_bonus === true;
  const levelInfo = getCourseLevel(levelKey, levels);
  const col = bandColumnFor(levelKey, levels);
  let pts: number;

  if (!weighted) {
    pts = row.points_by_level.regular ?? 0;
    if (L === 'A+') pts = Math.min(pts, table.a_plus_points);
    pts = Math.min(pts, table.unweighted_cap);
  } else if (row.points_by_level[col] != null) {
    pts = row.points_by_level[col]!;
  } else if (row.points_by_level[levelKey] != null) {
    pts = row.points_by_level[levelKey]!;
  } else {
    const base = row.points_by_level.regular ?? 0;
    if (isDLetter(L) && !levelInfo.bump_on_d) {
      pts = base;
    } else {
      pts = base + levelInfo.weighted_bonus;
    }
  }

  return pts;
}

function rowFlags(r: TranscriptRow): Set<string> {
  return new Set((r.flags ?? []).map((f) => f.toLowerCase()));
}

function includeOf(profile: GpaProfile): GpaInclude {
  return defaultInclude(profile.include ?? {});
}

function profileKind(profile: GpaProfile): 'unweighted' | 'weighted' | 'rank' | 'other' {
  const k = String(profile.key);
  if (k === 'rank_6' || k === 'rank') return 'rank';
  if (k === 'unweighted_4' || k === 'unweighted') return 'unweighted';
  if (k === 'weighted_5' || k === 'weighted') return 'weighted';
  if (!profile.use_level_bonus) return 'unweighted';
  return 'weighted';
}

/**
 * Resolve whether a transcript row counts in a profile (FR-GPA-03).
 * P/F pass never enters the denominator (FR-GPA-05).
 */
export function shouldIncludeRow(
  r: TranscriptRow,
  profile: GpaProfile,
): 'omit' | 'pf_pass' | 'count' {
  const kind = profileKind(profile);
  if (kind === 'unweighted' && r.include_unweighted === false) return 'omit';
  if (kind === 'weighted' && r.include_weighted === false) return 'omit';
  if (kind === 'rank' && r.include_rank === false) return 'omit';

  const flags = rowFlags(r);
  const inc = includeOf(profile);

  if (flags.has('pe') && !inc.pe) return 'omit';
  if (flags.has('athletics') && !inc.athletics) return 'omit';
  if (flags.has('aide') && !inc.aide) return 'omit';
  if ((flags.has('local') || flags.has('local_credit') || r.level === 'local') && !inc.local_credit) {
    return 'omit';
  }
  if ((flags.has('recovery') || flags.has('credit_recovery')) && !inc.recovery) return 'omit';
  if ((flags.has('cbe') || flags.has('credit_by_exam')) && !inc.cbe) return 'omit';
  if ((flags.has('pre9') || flags.has('pre_9') || flags.has('below_9')) && !inc.pre9) return 'omit';

  const L = normLetter(r.letter);
  if (r.pass_fail) {
    if (isPassPfLetter(L) || (r.credits_earned > 0 && !isFailLetter(L))) {
      return 'pf_pass';
    }
    return 'count';
  }
  if (isFailLetter(L) || (r.pct != null && r.credits_earned === 0 && L === 'F')) {
    if (inc.below_passing === 'omit') return 'omit';
  }
  return 'count';
}

/**
 * Compute include_* snapshot flags from course flags + three profiles (SRS §6.7).
 */
export function computeRowIncludeFlags(
  r: Pick<TranscriptRow, 'level' | 'pass_fail' | 'flags' | 'letter' | 'credits_earned' | 'pct'>,
  profiles: {
    unweighted?: GpaProfile | null;
    weighted?: GpaProfile | null;
    rank?: GpaProfile | null;
  },
): RowIncludeFlags {
  const asRow = r as TranscriptRow;
  const probe = (p: GpaProfile | null | undefined): boolean => {
    if (!p) return true;
    const mode = shouldIncludeRow({ ...asRow, id: 'x', student_id: 'x', course_name: 'x', term_code: 'x', credits_attempted: 1 }, p);
    return mode === 'count' || mode === 'pf_pass';
  };
  // P/F pass is "included" for credit display but not GPA denom — flag stays true for credit.
  return {
    include_unweighted: profiles.unweighted ? probe(profiles.unweighted) : true,
    include_weighted: profiles.weighted ? probe(profiles.weighted) : true,
    include_rank: profiles.rank ? probe(profiles.rank) : false,
  };
}

function applyRepeat(
  rows: TranscriptRow[],
  rule: GpaRepeatRule,
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
        return !isFailLetter(L) && !isDLetter(L);
      });
      for (const r of list) {
        const L = normLetter(r.letter);
        if (hasRetakePass && (isFailLetter(L) || isDLetter(L))) continue;
        out.push(r);
      }
    }
    return out;
  }

  // average handled in gpa()
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
      const synth: TranscriptRow & { __avg?: number } = {
        ...head,
        letter: head.letter,
        pct: head.pct,
        flags: [...(head.flags ?? []), '__avg_points'],
      };
      synth.__avg = avg;
      collapsed.push(synth);
    }
    working = collapsed;
  }

  let totalPoints = 0;
  let totalCredits = 0;
  const creditField = profile.credit_field ?? 'attempted';

  for (const r of working) {
    const mode = shouldIncludeRow(r, profile);
    if (mode === 'omit' || mode === 'pf_pass') continue;

    const credits = creditField === 'earned' ? r.credits_earned : r.credits_attempted;
    if (!(credits > 0) && !(r.pass_fail && isFailLetter(normLetter(r.letter)) && r.credits_attempted > 0)) {
      if (!(r.credits_attempted > 0)) continue;
    }
    const denomCredits =
      creditField === 'earned' && r.credits_earned <= 0 && isFailLetter(normLetter(r.letter))
        ? r.credits_attempted
        : credits > 0
          ? credits
          : r.credits_attempted;
    if (!(denomCredits > 0)) continue;

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

    if (isFailLetter(normLetter(r.letter))) pts = 0;

    totalPoints += pts * denomCredits;
    totalCredits += denomCredits;
  }

  if (totalCredits === 0) return 0;
  const raw = totalPoints / totalCredits;
  if (profile.cap != null && Number.isFinite(profile.cap)) {
    return Math.min(raw, profile.cap);
  }
  return raw;
}

/** FR-GPA-07 / §5.15 class rank GPA — uses rank_6 profile when present. */
export function classRankGpa(
  rows: TranscriptRow[],
  profiles: GpaProfile[],
  tables: Record<string, QualityPointTable>,
  levels: CourseLevel[] = DEFAULT_COURSE_LEVELS,
): number | null {
  const rank = profiles.find((p) => p.key === 'rank_6' || p.key === 'rank');
  if (!rank) return null;
  return gpa(rows, rank, tables, levels);
}

export function transferLetterToPct(letter: string): number {
  const key = letter.trim().toUpperCase().replace('−', '-');
  return DEFAULT_TRANSFER_PCT[key] ?? 55;
}

/** Whether UI should show Class Rank & GPA (not elementary parent / phone 6.0 grid). */
export function showClassRankGpaArea(opts: {
  school_level?: string | null;
  audience?: 'parent' | 'student' | 'teacher' | 'admin' | 'office';
  surface?: 'school_view' | 'parent_phone' | 'transcript' | 'wizard';
  has_rank_profile?: boolean;
}): boolean {
  if (opts.has_rank_profile === false) return false;
  if (opts.school_level === 'elementary') return false;
  if (opts.surface === 'parent_phone') return false;
  if (opts.audience === 'parent' && opts.surface !== 'school_view' && opts.surface !== 'transcript') {
    return false;
  }
  return true;
}
