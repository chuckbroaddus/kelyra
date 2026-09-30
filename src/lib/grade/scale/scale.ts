/**
 * Grade scales, letter lookup, rounding — SRS §5.9 FR-SCL-*, CONTRACT.md.
 * Pure TS. Passing is independent of whether a D band exists.
 */

export type Rounding = 'nearest_whole' | 'half_up' | 'truncate';

export type GradeScaleBand = {
  min_pct: number;
  max_pct: number;
  letter: string;
  passing: boolean;
  descriptor?: string;
};

export type GradeScale = {
  id: string;
  name: string;
  kind: 'percent' | 'mark';
  bands: GradeScaleBand[];
  passing_pct: number;
  rounding: Rounding;
  decimals: number;
};

/** Round before letter lookup (FR-SCL-04). half_up: 89.5 → 90 at decimals=0. */
export function roundPct(pct: number, mode: Rounding, decimals: number = 0): number {
  if (!Number.isFinite(pct)) return Number.NaN;
  const d = Math.max(0, Math.floor(decimals));
  const f = 10 ** d;
  const scaled = pct * f;
  if (mode === 'truncate') {
    return (scaled >= 0 ? Math.floor(scaled) : Math.ceil(scaled)) / f;
  }
  if (mode === 'half_up') {
    return Math.floor(scaled + 0.5) / f;
  }
  return Math.round(scaled) / f;
}

/** Percent → letter. Rounding runs first. Mark scales: null. */
export function letterFor(scale: GradeScale, pct: number): string | null {
  if (!Number.isFinite(pct)) return null;
  if (scale.kind === 'mark') return null;
  const rounded = roundPct(pct, scale.rounding, scale.decimals);
  for (const b of scale.bands) {
    if (rounded >= b.min_pct && rounded <= b.max_pct) return b.letter;
  }
  if (scale.bands.length > 0) {
    const top = scale.bands.reduce((a, b) => (b.max_pct > a.max_pct ? b : a));
    if (rounded > top.max_pct) return top.letter;
  }
  return 'F';
}

export function isPassing(scale: GradeScale, letterOrPct: string | number): boolean {
  if (typeof letterOrPct === 'number') {
    if (Number.isFinite(scale.passing_pct) && scale.kind === 'percent') {
      const rounded = roundPct(letterOrPct, scale.rounding, scale.decimals);
      return rounded >= scale.passing_pct;
    }
    const letter = letterFor(scale, letterOrPct);
    if (!letter) return false;
    return scale.bands.some((b) => b.letter === letter && b.passing);
  }
  const band = scale.bands.find((b) => b.letter === letterOrPct);
  return band ? band.passing : false;
}

function pctBands(
  rows: Array<[number, number, string, boolean]>,
): GradeScaleBand[] {
  return rows.map(([min_pct, max_pct, letter, passing]) => ({
    min_pct,
    max_pct,
    letter,
    passing,
  }));
}

/** Shipped templates FR-SCL-02. */
export const SCALE_TEMPLATES: Record<string, Omit<GradeScale, 'id'>> = {
  us_10: {
    name: 'US 10-point',
    kind: 'percent',
    bands: pctBands([
      [90, 100, 'A', true],
      [80, 89.9999, 'B', true],
      [70, 79.9999, 'C', true],
      [60, 69.9999, 'D', true],
      [0, 59.9999, 'F', false],
    ]),
    passing_pct: 60,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  texas_with_d: {
    name: 'Texas with D',
    kind: 'percent',
    bands: pctBands([
      [90, 100, 'A', true],
      [80, 89.9999, 'B', true],
      [75, 79.9999, 'C', true],
      [70, 74.9999, 'D', true],
      [0, 69.9999, 'F', false],
    ]),
    passing_pct: 70,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  texas_no_d: {
    name: 'Texas no-D',
    kind: 'percent',
    bands: pctBands([
      [90, 100, 'A', true],
      [80, 89.9999, 'B', true],
      [70, 79.9999, 'C', true],
      [0, 69.9999, 'F', false],
    ]),
    passing_pct: 70,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  college_plus_minus: {
    name: 'College plus/minus',
    kind: 'percent',
    bands: pctBands([
      [93, 100, 'A', true],
      [90, 92.9999, 'A-', true],
      [87, 89.9999, 'B+', true],
      [83, 86.9999, 'B', true],
      [80, 82.9999, 'B-', true],
      [77, 79.9999, 'C+', true],
      [73, 76.9999, 'C', true],
      [70, 72.9999, 'C-', true],
      [67, 69.9999, 'D+', true],
      [63, 66.9999, 'D', true],
      [60, 62.9999, 'D-', true],
      [0, 59.9999, 'F', false],
    ]),
    passing_pct: 60,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  seven_point: {
    name: '7-point',
    kind: 'percent',
    bands: pctBands([
      [93, 100, 'A', true],
      [85, 92.9999, 'B', true],
      [77, 84.9999, 'C', true],
      [70, 76.9999, 'D', true],
      [0, 69.9999, 'F', false],
    ]),
    passing_pct: 70,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  esnu: {
    name: 'E/S/N/U',
    kind: 'mark',
    bands: [
      { min_pct: 0, max_pct: 100, letter: 'E', passing: true, descriptor: 'Excellent' },
      { min_pct: 0, max_pct: 100, letter: 'S', passing: true, descriptor: 'Satisfactory' },
      { min_pct: 0, max_pct: 100, letter: 'N', passing: false, descriptor: 'Needs Improvement' },
      { min_pct: 0, max_pct: 100, letter: 'U', passing: false, descriptor: 'Unsatisfactory' },
    ],
    passing_pct: 0,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  pf: {
    name: 'P/F',
    kind: 'mark',
    bands: [
      { min_pct: 0, max_pct: 100, letter: 'P', passing: true },
      { min_pct: 0, max_pct: 100, letter: 'F', passing: false },
    ],
    passing_pct: 0,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  su: {
    name: 'S/U',
    kind: 'mark',
    bands: [
      { min_pct: 0, max_pct: 100, letter: 'S', passing: true },
      { min_pct: 0, max_pct: 100, letter: 'U', passing: false },
    ],
    passing_pct: 0,
    rounding: 'nearest_whole',
    decimals: 0,
  },
  crnc: {
    name: 'CR/NC',
    kind: 'mark',
    bands: [
      { min_pct: 0, max_pct: 100, letter: 'CR', passing: true },
      { min_pct: 0, max_pct: 100, letter: 'NC', passing: false },
    ],
    passing_pct: 0,
    rounding: 'nearest_whole',
    decimals: 0,
  },
};

const ALIASES: Record<string, string> = {
  'us-10': 'us_10',
  'tx-with-d': 'texas_with_d',
  'tx-no-d': 'texas_no_d',
  'college-plusminus': 'college_plus_minus',
  '7-point': 'seven_point',
};

export function resolveScaleKey(key: string): string {
  return ALIASES[key] ?? key;
}

export function getScaleTemplate(key: string): GradeScale | null {
  const k = resolveScaleKey(key);
  const t = SCALE_TEMPLATES[k];
  if (!t) return null;
  return { id: k, ...t, bands: t.bands.map((b) => ({ ...b })) };
}

export function makeScaleFromTemplate(
  key: string,
  overrides?: Partial<GradeScale>,
): GradeScale {
  const base = getScaleTemplate(key);
  if (!base) throw new Error(`Unknown scale template: ${key}`);
  return {
    ...base,
    ...overrides,
    id: overrides?.id ?? base.id,
    bands: overrides?.bands ? overrides.bands.map((b) => ({ ...b })) : base.bands,
  };
}

export function listScaleTemplates(): Array<{
  key: string;
  name: string;
  kind: 'percent' | 'mark';
}> {
  return Object.entries(SCALE_TEMPLATES).map(([key, t]) => ({
    key,
    name: t.name,
    kind: t.kind,
  }));
}
