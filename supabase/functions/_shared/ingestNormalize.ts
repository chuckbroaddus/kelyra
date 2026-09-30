/**
 * Pure coerce of model field values into SetupDraft / IngestProposal shapes.
 * No network. Used by parseIngestProposal + edge ingest-grading-doc.
 */
import { ENGINE_VALUES, ROLLUP_PRESETS } from './ingestAllowedPaths.ts';
import type {
  IngestAmbiguity,
  IngestEvidence,
  IngestField,
  IngestFieldStatus,
  IngestProposal,
  IngestWarning,
} from './ingestProposalTypes.ts';

const ENGINE_SET = new Set<string>(ENGINE_VALUES);
const PRESET_SET = new Set<string>(ROLLUP_PRESETS);

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function slugKey(label: string, i: number): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 32) || `cat_${i + 1}`
  );
}

function evidenceOk(ev: IngestEvidence | undefined | null): boolean {
  if (!ev) return false;
  const q = typeof ev.quote === 'string' ? ev.quote.trim() : '';
  const r = typeof ev.region === 'string' ? ev.region.trim() : '';
  return q.length > 0 || r.length > 0;
}

function statusFor(conf: number, explicit: unknown): IngestFieldStatus {
  if (
    explicit === 'proposed' ||
    explicit === 'needs_review' ||
    explicit === 'unknown' ||
    explicit === 'conflict'
  ) {
    return explicit;
  }
  if (conf >= 0.8) return 'proposed';
  if (conf >= 0.5) return 'needs_review';
  return 'unknown';
}

// --- coerce helpers continue below ---
export type CoercedCategory = {
  key: string;
  label: string;
  weight_percent: number;
  drop_lowest?: number;
  min_grades?: number | null;
  empty_policy?: 'renormalize' | 'zero' | null;
};

/** Parse free-text / loose late rules into LateRule shape. */
export function coerceLateRule(raw: unknown): {
  type: 'none' | 'flat' | 'per_day' | 'per_hour';
  amount?: number;
  unit?: 'percent' | 'points';
  floor_pct?: number | null;
  hard_deadline_days?: number | null;
  grace_hours?: number;
} | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.toLowerCase().trim();
    if (!s) return null;
    if (
      /not\s*accepted|no\s*late|late\s*work\s*not|none\b|not_accepted|hard\s*deadline/.test(s) &&
      !/\d+\s*%/.test(s) &&
      !/per\s*day|per\s*hour/.test(s)
    ) {
      return { type: 'none' };
    }
    const perDay = s.match(/(-?\d+(?:\.\d+)?)\s*%?\s*(?:points?|pts?)?\s*per\s*day/);
    if (perDay || /per\s*day/.test(s)) {
      const amount = Math.abs(
        num(perDay?.[1]) ?? (s.match(/(\d+(?:\.\d+)?)/) ? Number(RegExp.$1) : 10),
      );
      const unit = /point/.test(s) ? 'points' : 'percent';
      return { type: 'per_day', amount, unit };
    }
    const perHour = s.match(/(-?\d+(?:\.\d+)?)\s*%?\s*(?:points?|pts?)?\s*per\s*hour/);
    if (perHour || /per\s*hour/.test(s)) {
      const amount = Math.abs(num(perHour?.[1]) ?? 5);
      const unit = /point/.test(s) ? 'points' : 'percent';
      return { type: 'per_hour', amount, unit };
    }
    const flat = s.match(/(?:flat|minus|−|-)?\s*(-?\d+(?:\.\d+)?)\s*(%|percent|points?|pts?)/);
    if (flat) {
      const amount = Math.abs(Number(flat[1]));
      const unit = /point/.test(flat[2]) ? 'points' : 'percent';
      return { type: 'flat', amount, unit };
    }
    if (/^none$|^not_accepted$/.test(s)) return { type: 'none' };
    return null;
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let type = typeof o.type === 'string' ? o.type.toLowerCase() : '';
  if (type === 'flat_percent' || type === 'flat_points') type = 'flat';
  if (type === 'percent_per_day' || type === 'per-day') type = 'per_day';
  if (type === 'percent_per_hour' || type === 'per-hour') type = 'per_hour';
  if (type === 'not_accepted' || type === 'no_late' || type === 'hard_deadline') type = 'none';
  if (type !== 'none' && type !== 'flat' && type !== 'per_day' && type !== 'per_hour') {
    if (o.amount != null && (o.per === 'day' || o.unit_time === 'day')) type = 'per_day';
    else if (o.amount != null && (o.per === 'hour' || o.unit_time === 'hour')) type = 'per_hour';
    else if (o.amount != null) type = 'flat';
    else return null;
  }
  const amount = num(o.amount ?? o.percent ?? o.pct);
  let unit: 'percent' | 'points' | undefined;
  if (o.unit === 'points' || o.unit === 'percent') unit = o.unit;
  else if (typeof o.unit === 'string' && /point/.test(o.unit)) unit = 'points';
  else if (typeof o.unit === 'string' && /percent|%/.test(o.unit)) unit = 'percent';
  else if (type !== 'none') unit = 'percent';
  const out: {
    type: 'none' | 'flat' | 'per_day' | 'per_hour';
    amount?: number;
    unit?: 'percent' | 'points';
    floor_pct?: number | null;
    hard_deadline_days?: number | null;
    grace_hours?: number;
  } = { type: type as 'none' | 'flat' | 'per_day' | 'per_hour' };
  if (type !== 'none' && amount != null) out.amount = Math.abs(amount);
  if (unit) out.unit = unit;
  if (o.floor_pct != null) out.floor_pct = num(o.floor_pct);
  if (o.hard_deadline_days != null) out.hard_deadline_days = num(o.hard_deadline_days);
  if (o.grace_hours != null) {
    const g = num(o.grace_hours);
    if (g != null) out.grace_hours = g;
  }
  return out;
}

export function coerceEngine(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  if (ENGINE_SET.has(s)) return s;
  if (s === 'points' || s === 'total' || s === 'point_total' || s === 'sum_points') return 'total_points';
  if (s === 'weighted' || s === 'weights' || s === 'weighted_percent' || s === 'category_weights') {
    return 'weighted_percent_inside';
  }
  if (s === 'weighted_points' || s === 'points_inside_weighted') return 'weighted_points_inside';
  if (s === 'item' || s === 'assignment_weights') return 'item_weights';
  if (s === 'sbg' || s === 'standards' || s === 'ungraded' || s === 'none') return 'none';
  return null;
}

export function coerceMissingRule(raw: unknown): 'zero' | 'floor' | 'omit' | null {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const t = (raw as { type?: unknown }).type;
    return coerceMissingRule(t);
  }
  const s = String(raw).toLowerCase().trim();
  if (s === 'zero' || s === '0' || /count[s]?\s+as\s+zero|missing.*zero|zero\s+for\s+missing/.test(s)) {
    return 'zero';
  }
  if (s === 'floor' || /missing.*floor|floor\s+for\s+missing/.test(s)) return 'floor';
  if (s === 'omit' || s === 'excuse' || s === 'excused' || /omit|do\s+not\s+count|excused/.test(s)) {
    return 'omit';
  }
  return null;
}

export function coerceWithinCategory(raw: unknown): 'points_inside' | 'percent_inside' | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  if (s === 'points_inside' || s === 'points' || s === 'sum_points' || s === 'total_points_inside') {
    return 'points_inside';
  }
  if (s === 'percent_inside' || s === 'percent' || s === 'average_percent' || s === 'mean_percent') {
    return 'percent_inside';
  }
  return null;
}

export function coerceCategories(raw: unknown): CoercedCategory[] | null {
  let list: unknown = raw;
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list) || !list.length) return null;
  const out: CoercedCategory[] = [];
  list.forEach((row, i) => {
    if (!row || typeof row !== 'object') return;
    const o = row as Record<string, unknown>;
    const labelRaw =
      (typeof o.label === 'string' && o.label) ||
      (typeof o.name === 'string' && o.name) ||
      (typeof o.category === 'string' && o.category) ||
      (typeof o.title === 'string' && o.title) ||
      '';
    if (!labelRaw && o.weight == null && o.weight_percent == null && o.pct == null) return;
    const label = String(labelRaw || `Category ${i + 1}`);
    const keyRaw = typeof o.key === 'string' && o.key ? o.key : label;
    let w = num(o.weight_percent ?? o.weight ?? o.pct ?? o.percent);
    if (w == null) w = 0;
    const drop = num(o.drop_lowest ?? o.drop_lowest_n ?? o.drops);
    const minG = num(o.min_grades ?? o.min_grades_per_term);
    const cat: CoercedCategory = {
      key: slugKey(String(keyRaw), i),
      label,
      weight_percent: w,
    };
    if (drop != null && drop > 0) cat.drop_lowest = Math.floor(drop);
    if (minG != null) cat.min_grades = minG;
    if (o.empty_policy === 'zero' || o.empty_policy === 'renormalize') cat.empty_policy = o.empty_policy;
    out.push(cat);
  });
  if (!out.length) return null;
  // Fraction weights (sum near 1) → ×100. Never touch 90/110 sums (FR-AI-21).
  const sum = out.reduce((s, c) => s + c.weight_percent, 0);
  if (sum > 0.4 && sum <= 1.05) {
    for (const c of out) c.weight_percent = Math.round(c.weight_percent * 1000) / 10;
  }
  return out;
}

export function coerceRetake(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.toLowerCase();
    if (/higher|best|max/.test(s)) return { method: 'higher_of', attempts: 1, cap: null };
    if (/replace|new\s+score/.test(s)) return { method: 'replace', attempts: 1, cap: null };
    if (/average|avg|mean/.test(s)) return { method: 'average', attempts: 1, cap: null };
    const cap = s.match(/cap(?:ped)?\s*(?:at\s*)?(\d+)/);
    if (cap) return { method: 'higher_of', attempts: 1, cap: Number(cap[1]) };
    return null;
  }
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  let method = typeof o.method === 'string' ? o.method.toLowerCase() : '';
  if (method === 'highest' || method === 'max' || method === 'higher') method = 'higher_of';
  if (method === 'overwrite') method = 'replace';
  if (method !== 'replace' && method !== 'higher_of' && method !== 'average') {
    if (o.keep_highest || o.higher_of) method = 'higher_of';
    else if (o.replace) method = 'replace';
    else return null;
  }
  const attempts = num(o.attempts ?? o.max_attempts) ?? 1;
  const cap = o.cap == null ? null : num(o.cap);
  const eligible = Array.isArray(o.eligible_category_ids)
    ? o.eligible_category_ids.map(String)
    : Array.isArray(o.categories)
      ? o.categories.map(String)
      : [];
  return {
    eligible_category_ids: eligible,
    attempts: Math.max(1, Math.floor(attempts)),
    method,
    cap,
    window_days: o.window_days == null ? null : num(o.window_days),
  };
}

export function coerceQpMethod(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'numeric_band' || s === 'band' || s === 'numeric' || s === 'bands') return 'numeric_band';
  if (s === 'letter_map' || s === 'letter') return 'letter_map';
  if (s === 'percent_map' || s === 'percent') return 'percent_map';
  return s || null;
}

/** Map custom rollup weights onto a preset enum when they match. */
export function mapCustomWeightsToPreset(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string' && PRESET_SET.has(raw)) return raw;
  if (typeof raw !== 'object') {
    if (typeof raw === 'string') {
      const s = raw.toLowerCase();
      if (/2\s*\/\s*7/.test(s) && /1\s*\/\s*7/.test(s)) return '2/7+1/7';
      if (/40\s*\/\s*40\s*\/\s*20/.test(s)) return '40/40/20';
      if (/50\s*\/\s*50/.test(s)) return '50/50';
    }
    return null;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.preset === 'string' && PRESET_SET.has(o.preset)) return o.preset;
  const periods = Array.isArray(o.periods) ? o.periods.map((x) => num(x) ?? 0) : null;
  const exam = num(o.exam ?? o.exam_weight ?? o.final);
  const den = num(o.denominator ?? o.den);
  if (periods && periods.length >= 2 && exam != null) {
    const p0 = periods[0]!;
    if (periods.every((p) => Math.abs(p - p0) < 0.01) && den != null) {
      if (Math.abs(p0 - 2) < 0.01 && Math.abs(exam - 1) < 0.01 && Math.abs(den - 7) < 0.01) {
        return '2/7+1/7';
      }
      if (Math.abs(p0 - 3) < 0.01 && Math.abs(exam - 1) < 0.01 && Math.abs(den - 7) < 0.01) {
        return '3/7+3/7+1/7';
      }
    }
  }
  const w = Array.isArray(o.weights) ? o.weights.map((x) => num(x) ?? 0) : periods;
  if (w && w.length === 3) {
    const [a, b, c] = w;
    if (a === 40 && b === 40 && c === 20) return '40/40/20';
    if (a === 45 && b === 45 && c === 10) return '45/45/10';
  }
  if (w && w.length === 2) {
    const [a, b] = w;
    if (a === 50 && b === 50) return '50/50';
    if (a === 85 && b === 15) return '85/15';
  }
  if (w && w.length === 4 && w.every((x) => x === 25)) return '25x4';
  const blob = JSON.stringify(o).toLowerCase();
  if (/2\s*\/\s*7/.test(blob) && /1\s*\/\s*7/.test(blob)) return '2/7+1/7';
  if (/40\s*\/\s*40\s*\/\s*20/.test(blob)) return '40/40/20';
  if (/50\s*\/\s*50/.test(blob)) return '50/50';
  return null;
}

export function coerceRollupPreset(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (PRESET_SET.has(s)) return s;
    const compact = s.replace(/\s+/g, '');
    if (PRESET_SET.has(compact)) return compact;
    if (/2\/7/.test(s) && /1\/7/.test(s)) return '2/7+1/7';
    if (/40\/40\/20/.test(s)) return '40/40/20';
    if (/45\/45\/10/.test(s)) return '45/45/10';
    if (/50\/50/.test(s)) return '50/50';
    if (/year.?mean|simple\s+average|average\s+of\s+periods/.test(s.toLowerCase())) return 'year_mean';
    return mapCustomWeightsToPreset(raw);
  }
  if (typeof raw === 'object') return mapCustomWeightsToPreset(raw);
  return null;
}

export function coerceCalendarTemplate(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  const map: Record<string, string> = {
    tx_six_weeks: 'tx_six_weeks',
    six_weeks: 'tx_six_weeks',
    six_week: 'tx_six_weeks',
    '6_weeks': 'tx_six_weeks',
    texas_six_weeks: 'tx_six_weeks',
    nine_weeks: 'nine_weeks',
    '9_weeks': 'nine_weeks',
    trimester: 'trimester',
    college_term: 'college_term',
    college: 'college_term',
    semester: 'semester',
    elementary_year_4: 'elementary_year_4',
    elementary_year_6: 'elementary_year_6',
  };
  return map[s] ?? null;
}

export function coercePeriodModel(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim().replace(/\s+/g, '_');
  if (s === 'six_weeks' || s === 'six_week' || s === '6_weeks' || s === 'tx_six_weeks') return 'six_weeks';
  if (s === 'nine_weeks' || s === '9_weeks') return 'nine_weeks';
  if (s === 'trimester' || s === 'semester' || s === 'year' || s === 'college' || s === 'custom') return s;
  return null;
}

function looksMixedDocument(proposal: {
  document_kind_guess?: string | null;
  fields: IngestField[];
  warnings: IngestWarning[];
  ambiguities: IngestAmbiguity[];
}): boolean {
  const guess = (proposal.document_kind_guess || '').toLowerCase();
  if (guess === 'mixed' || guess.includes('two_doc') || guess.includes('multi')) return true;
  for (const w of proposal.warnings) {
    const m = `${w.code} ${w.message}`.toLowerCase();
    if (/mixed|two\s+(syllabi|documents|policies)|multiple\s+documents|two\s+classes/.test(m)) {
      return true;
    }
  }
  const title = proposal.fields.find((f) => f.path === 'syllabus.title' || f.path === 'school.notes');
  if (title && typeof title.value === 'string') {
    const t = title.value;
    if (/\//.test(t) && /—|-/.test(t) && (t.match(/—|-/g) || []).length >= 2) return true;
    if (/\bsyllabus\b.*\bsyllabus\b/i.test(t)) return true;
  }
  return false;
}

/**
 * Coerce every field value; drop filled values with no evidence;
 * mixed-doc → empty fields + block warning (FR-AI-13).
 */
export function normalizeProposalFields(proposal: IngestProposal): IngestProposal {
  const warnings = [...proposal.warnings];
  const ambiguities = [...proposal.ambiguities];
  const fields = [...proposal.fields];
  const document_kind_guess = proposal.document_kind_guess;

  if (looksMixedDocument({ document_kind_guess, fields, warnings, ambiguities })) {
    warnings.push({
      code: 'mixed_document',
      message:
        'This image looks like two documents or two class policies on one page. Retake: photograph each syllabus or handbook page separately.',
      severity: 'block',
    });
    return {
      ...proposal,
      fields: [],
      ambiguities: [
        ...ambiguities,
        {
          code: 'mixed_document',
          message: 'Separate the documents and scan again.',
          paths: [],
          choices: ['retake_separate_pages'],
        },
      ],
      warnings,
      document_kind_guess: document_kind_guess || 'mixed',
      overall_confidence: Math.min(proposal.overall_confidence, 0.2),
    };
  }

  const out: IngestField[] = [];
  let derivedPreset: IngestField | null = null;
  let derivedPeriod: IngestField | null = null;

  for (const f of fields) {
    const path = f.path;
    let value: unknown = f.value;
    let confidence = f.confidence;
    let status = f.status;
    const ev = f.evidence;

    if (value != null && value !== '' && !evidenceOk(ev) && status !== 'unknown') {
      warnings.push({
        code: 'dropped_no_evidence',
        message: `Dropped ${path}: no evidence quote on page.`,
        severity: 'info',
      });
      continue;
    }

    switch (path) {
      case 'syllabus.late_rule': {
        const lr = coerceLateRule(value);
        if (lr) value = lr;
        else if (value != null) {
          status = 'needs_review';
          confidence = Math.min(confidence, 0.6);
        }
        break;
      }
      case 'syllabus.engine': {
        const eng = coerceEngine(value);
        if (eng) value = eng;
        else if (value != null) {
          status = 'needs_review';
          confidence = Math.min(confidence, 0.55);
        }
        break;
      }
      case 'syllabus.within_category': {
        const w = coerceWithinCategory(value);
        value = w;
        if (w == null && f.value != null) {
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
          if (!ambiguities.some((a) => a.code === 'within_category')) {
            ambiguities.push({
              code: 'within_category',
              message: 'Document does not clearly say how items combine inside a category.',
              paths: ['syllabus.within_category'],
              choices: ['points_inside', 'percent_inside'],
            });
          }
        }
        break;
      }
      case 'syllabus.categories': {
        const cats = coerceCategories(value);
        if (cats) value = cats;
        break;
      }
      case 'syllabus.missing_rule': {
        const m = coerceMissingRule(value);
        if (m) value = m;
        else if (value != null) {
          warnings.push({
            code: 'unmapped_missing_rule',
            message: 'Could not map missing rule; left empty.',
            severity: 'info',
          });
          value = null;
          status = 'unknown';
          confidence = Math.min(confidence, 0.4);
        }
        break;
      }
      case 'syllabus.retake': {
        value = coerceRetake(value);
        break;
      }
      case 'syllabus.floor':
      case 'syllabus.ceiling':
      case 'syllabus.ec_cap':
      case 'syllabus.exam_weight':
      case 'credit.passing_threshold':
      case 'scale.passing_pct': {
        value = num(value);
        break;
      }
      case 'syllabus.extra_credit_method': {
        if (value != null) {
          const s = String(value).toUpperCase().trim();
          value = s === 'A' || s === 'B' || s === 'C' ? s : null;
        }
        break;
      }
      case 'calendar.template': {
        const t = coerceCalendarTemplate(value);
        if (t) value = t;
        break;
      }
      case 'calendar.period_model': {
        const p = coercePeriodModel(value);
        if (p) value = p;
        break;
      }
      case 'rollup.preset': {
        const p = coerceRollupPreset(value);
        if (p) value = p;
        break;
      }
      case 'rollup.custom_weights': {
        const preset = mapCustomWeightsToPreset(value);
        if (preset) {
          derivedPreset = {
            path: 'rollup.preset',
            value: preset,
            confidence,
            evidence: ev,
            status: statusFor(confidence, status),
            source_doc_id: f.source_doc_id,
          };
          continue;
        }
        break;
      }
      case 'qp.method': {
        const m = coerceQpMethod(value);
        if (m) value = m;
        break;
      }
      case 'levels.list': {
        if (Array.isArray(value)) {
          value = value.map((row, i) => {
            if (typeof row === 'string') {
              const label = row;
              const key = slugKey(label, i);
              let bonus = 0;
              if (/^ap\b/i.test(label) || label.toUpperCase() === 'AP') bonus = 1;
              else if (/honors/i.test(label)) bonus = 0.5;
              return { key, label, weighted_bonus: bonus };
            }
            if (row && typeof row === 'object') {
              const o = row as Record<string, unknown>;
              const label = String(o.label ?? o.name ?? o.key ?? `Level ${i + 1}`);
              const key = String(o.key ?? slugKey(label, i));
              const bonus = num(o.weighted_bonus ?? o.bonus ?? o.points) ?? 0;
              return { ...o, key, label, weighted_bonus: bonus };
            }
            return row;
          });
        }
        break;
      }
      default:
        break;
    }

    if (path === 'calendar.template' && typeof value === 'string') {
      if (value === 'tx_six_weeks') {
        derivedPeriod = {
          path: 'calendar.period_model',
          value: 'six_weeks',
          confidence: Math.min(confidence, 0.9),
          evidence: ev,
          status: statusFor(Math.min(confidence, 0.9), null),
          source_doc_id: f.source_doc_id,
        };
      } else if (value === 'nine_weeks') {
        derivedPeriod = {
          path: 'calendar.period_model',
          value: 'nine_weeks',
          confidence: Math.min(confidence, 0.9),
          evidence: ev,
          status: statusFor(Math.min(confidence, 0.9), null),
          source_doc_id: f.source_doc_id,
        };
      }
    }

    if (value == null && f.value != null && status === 'proposed') {
      // coerced away entirely
      continue;
    }

    out.push({
      ...f,
      value,
      confidence,
      status: statusFor(confidence, status),
    });
  }

  const byPath = new Map<string, IngestField>();
  for (const f of out) {
    const prev = byPath.get(f.path);
    if (!prev || f.confidence > prev.confidence) byPath.set(f.path, f);
  }
  if (derivedPreset && !byPath.has('rollup.preset')) byPath.set('rollup.preset', derivedPreset);
  if (derivedPeriod && !byPath.has('calendar.period_model')) {
    byPath.set('calendar.period_model', derivedPeriod);
  }

  const levels = byPath.get('levels.list');
  if (levels && Array.isArray(levels.value) && !byPath.has('gpa.mode')) {
    const hasBonus = levels.value.some(
      (row) =>
        row && typeof row === 'object' && Number((row as { weighted_bonus?: number }).weighted_bonus) > 0,
    );
    if (hasBonus && evidenceOk(levels.evidence)) {
      byPath.set('gpa.mode', {
        path: 'gpa.mode',
        value: 'unweighted_and_weighted',
        confidence: Math.min(levels.confidence, 0.85),
        evidence: levels.evidence,
        status: statusFor(Math.min(levels.confidence, 0.85), null),
        source_doc_id: levels.source_doc_id,
      });
    }
  }

  const finalFields = [...byPath.values()].filter((f) => {
    if (f.value == null && f.status === 'proposed') return false;
    return true;
  });

  const overall =
    finalFields.length > 0
      ? finalFields.reduce((s, f) => s + f.confidence, 0) / finalFields.length
      : proposal.overall_confidence;

  return {
    ...proposal,
    fields: finalFields,
    ambiguities,
    warnings,
    document_kind_guess,
    overall_confidence: overall,
  };
}

/** True when school handbook core fields are present enough to skip retry. */
export function schoolProposalHasCore(proposal: IngestProposal): boolean {
  const paths = new Set(proposal.fields.filter((f) => f.value != null).map((f) => f.path));
  const hasCal = paths.has('calendar.template') || paths.has('calendar.period_model');
  const hasRoll = paths.has('rollup.preset') || paths.has('rollup.custom_weights');
  return proposal.fields.length > 0 && (hasCal || hasRoll || paths.has('credit.passing_threshold'));
}
