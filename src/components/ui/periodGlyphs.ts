/**
 * periodGlyphs.ts (GB-04)
 * Pure: glyphsForCalendar(calendar) -> GlyphSpec[]
 * Follows SRS §5.10 exactly. Local minimal types from CONTRACT.
 */

export type PeriodModel =
  | 'six_weeks' | 'nine_weeks' | 'trimester' | 'semester' | 'year' | 'college' | 'custom';

export type MarkingPeriod = {
  id: string; code: string; name: string;
  kind: 'marking_period' | 'credit_term' | 'year' | 'progress' | 'exam';
  parent_id: string | null;
  start_date: string | null; end_date: string | null;
  sort_order: number;
};

export type GradingCalendar = {
  id: string; school_id: string | null; name: string;
  level: 'elementary' | 'middle' | 'high' | 'college';
  period_model: PeriodModel;
  periods: MarkingPeriod[];
  rollups: unknown[];
  show_interims_in_filter: boolean;
  glyph_scope: 'semester' | 'year';
};

export type GlyphSpec = {
  id: string;
  startDeg: number;
  sweepDeg: number;
  label: string;
  storeCode: string;
  dateRange: string;
  kind: string;
};

function fmtRange(s: string | null, e: string | null): string {
  if (!s && !e) return '';
  const ss = s ? s.slice(5,10) : '';
  const ee = e ? e.slice(5,10) : '';
  return ss && ee ? `${ss}–${ee}` : ss || ee || '';
}

// small growth: ensure we can add progress/exam later from calendar data without changing binding
export function hasProgress(c: GradingCalendar): boolean {
  return c.show_interims_in_filter && c.periods.some(p => p.kind === 'progress');
}

export function glyphsForCalendar(c: GradingCalendar | null | undefined): GlyphSpec[] {
  if (!c?.period_model) return [];
  const model = c.period_model;
  const scope = c.glyph_scope || 'semester';
  const ps = c.periods || [];
  const find = (code: string) => ps.find(p => (p.code || '').toLowerCase() === code.toLowerCase());

  const all: GlyphSpec = { id: 'all', startDeg: 0, sweepDeg: 360, label: 'All', storeCode: 'ALL', dateRange: '', kind: 'all' };
  const out: GlyphSpec[] = [all];

  // exact tables FR-UI-GLYPH-03/04/05
  const G: Record<string, {s:number, w:number}> = {
    year: {s:0, w:360}, s1:{s:180,w:180}, s2:{s:0,w:180},
    q1:{s:180,w:90}, q2:{s:270,w:90}, q3:{s:0,w:90}, q4:{s:90,w:90},
    t1:{s:180,w:120}, t2:{s:300,w:120}, t3:{s:60,w:120},
    '6w1':{s:180,w:120}, '6w2':{s:300,w:120}, '6w3':{s:60,w:120},
    '6w4':{s:180,w:120}, '6w5':{s:300,w:120}, '6w6':{s:60,w:120},
    '6wy1':{s:180,w:60}, '6wy2':{s:240,w:60}, '6wy3':{s:300,w:60},
    '6wy4':{s:0,w:60}, '6wy5':{s:60,w:60}, '6wy6':{s:120,w:60},
    progress: {s:0,w:0}, 'exam_s1':{s:0,w:360}, 'exam_s2':{s:0,w:360},
  };

  let codes: string[] = [];
  if (model === 'six_weeks') {
    codes = scope === 'year'
      ? ['6wy1','6wy2','6wy3','s1','6wy4','6wy5','6wy6','s2']
      : ['6w1','6w2','6w3','s1','6w4','6w5','6w6','s2'];
  } else if (model === 'nine_weeks') {
    codes = ['q1','q2','s1','q3','q4','s2'];
  } else if (model === 'trimester') {
    codes = ['t1','t2','t3'];
  } else if (model === 'semester') {
    codes = ['s1','s2'];
  } else if (model === 'year') {
    codes = ['year'];
  } else if (model === 'college') {
    codes = [];
  } else if (model === 'custom') {
    codes = ps.filter(p => p.kind==='marking_period'||p.kind==='credit_term')
      .sort((a,b)=>a.sort_order-b.sort_order).map(p=> (p.code||'').toLowerCase());
  }

  for (const code of codes) {
    const p = find(code);
    let g = G[code] || G[code.toLowerCase()] || {s:0, w:360};
    if (model === 'custom' && codes.length) {
      const i = codes.indexOf(code);
      const sw = 360 / codes.length;
      g = { s: 180 + i * sw, w: sw };
    }
    out.push({
      id: code.toLowerCase(),
      startDeg: g.s,
      sweepDeg: g.w,
      label: p?.name || code.toUpperCase(),
      storeCode: p?.code || code.toUpperCase(),
      dateRange: fmtRange(p?.start_date || null, p?.end_date || null),
      kind: p?.kind || 'marking_period',
    });
  }

  // progress if enabled (FR-UI-GLYPH-07)
  if (c.show_interims_in_filter) {
    const prog = c.periods.find(p => p.kind === 'progress');
    if (prog) {
      out.push({
        id: 'progress',
        startDeg: 0,
        sweepDeg: 0,
        label: prog.name || 'Progress',
        storeCode: prog.code || 'PROG',
        dateRange: fmtRange(prog.start_date, prog.end_date),
        kind: 'progress',
      });
    }
  }
  return out;
}
