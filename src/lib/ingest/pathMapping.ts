/**
 * Map IngestProposal field values onto SyllabusWizardDraft / SetupDraft paths.
 */
import type { SyllabusWizardDraft } from '../../components/syllabus/wizardModel.ts';
import type { LateRule } from '../grade/engine/types.ts';
import type { SetupDraft, SetupDraftField } from '../school/gradingPolicy.ts';
import { asIngestableDraft, mergeProposalIntoDraft } from './mergeProposal.ts';
import type { IngestProposal, MergeOptions, MergeResult } from './proposalTypes.ts';

function asLateRule(raw: unknown): LateRule {
  if (raw == null) return { type: 'none' };
  if (typeof raw === 'string') {
    // Mirror coerceLateRule basics for string leftovers
    const s = raw.toLowerCase();
    if (/not\s*accepted|no\s*late|none|not_accepted|hard\s*deadline/.test(s) && !/per\s*day|per\s*hour|\d+\s*%/.test(s)) {
      return { type: 'none' };
    }
    const m = s.match(/(-?\d+(?:\.\d+)?)\s*%?\s*(?:points?)?\s*per\s*day/);
    if (m || /per\s*day/.test(s)) {
      return {
        type: 'per_day',
        amount: Math.abs(Number(m?.[1] ?? 10)),
        unit: /point/.test(s) ? 'points' : 'percent',
      };
    }
    const h = s.match(/(-?\d+(?:\.\d+)?)\s*%?\s*per\s*hour/);
    if (h || /per\s*hour/.test(s)) {
      return {
        type: 'per_hour',
        amount: Math.abs(Number(h?.[1] ?? 5)),
        unit: /point/.test(s) ? 'points' : 'percent',
      };
    }
    const flat = s.match(/(-?\d+(?:\.\d+)?)\s*(%|percent|points?)/);
    if (flat) {
      return {
        type: 'flat',
        amount: Math.abs(Number(flat[1])),
        unit: /point/.test(flat[2]) ? 'points' : 'percent',
      };
    }
    return { type: 'none' };
  }
  if (typeof raw !== 'object') return { type: 'none' };
  const o = raw as Record<string, unknown>;
  let type = o.type;
  if (type === 'flat_percent' || type === 'flat_points') type = 'flat';
  if (type === 'percent_per_day') type = 'per_day';
  if (type === 'percent_per_hour') type = 'per_hour';
  if (type === 'not_accepted' || type === 'hard_deadline') type = 'none';
  if (type === 'flat' || type === 'per_day' || type === 'per_hour' || type === 'none') {
    return {
      type,
      amount: o.amount == null ? undefined : Number(o.amount),
      unit: o.unit === 'points' || o.unit === 'percent' ? o.unit : undefined,
      floor_pct: o.floor_pct == null ? null : Number(o.floor_pct),
      hard_deadline_days: o.hard_deadline_days == null ? null : Number(o.hard_deadline_days),
      grace_hours: o.grace_hours == null ? undefined : Number(o.grace_hours),
    };
  }
  return { type: 'none' };
}

function asCategories(raw: unknown): SyllabusWizardDraft['categories'] | null {
  if (!Array.isArray(raw) || !raw.length) return null;
  const out: SyllabusWizardDraft['categories'] = [];
  raw.forEach((row, i) => {
    if (!row || typeof row !== 'object') return;
    const o = row as Record<string, unknown>;
    const label = typeof o.label === 'string' ? o.label : `Category ${i + 1}`;
    const keyRaw = typeof o.key === 'string' ? o.key : label;
    const key =
      String(keyRaw)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 32) || `cat_${i + 1}`;
    const dropLowest = Number(o.drop_lowest ?? o.drop_lowest_n ?? 0);
    out.push({
      key,
      label,
      weight_percent: Number(o.weight_percent ?? o.weight ?? 0),
      sort_order: typeof o.sort_order === 'number' ? o.sort_order : i,
      active: o.active !== false,
      group: null,
      default_include_in_average: o.default_include_in_average !== false,
      min_grades_per_term:
        o.min_grades == null && o.min_grades_per_term == null
          ? null
          : Number(o.min_grades ?? o.min_grades_per_term),
      rules: {
        drop_lowest_n: Number.isFinite(dropLowest) ? Math.max(0, dropLowest) : 0,
        replace_lowest_with_makeup: { enabled: false, max_replacements: 1 },
      },
      drop_highest_n: Number(o.drop_highest_n ?? 0) || 0,
      keep_highest_n: o.keep_highest_n == null ? null : Number(o.keep_highest_n),
      droppable: o.droppable !== false,
      never_drop_flags: Array.isArray(o.never_drop_flags) ? o.never_drop_flags.map(String) : [],
      empty_policy:
        o.empty_policy === 'zero' ? 'zero' : o.empty_policy === 'renormalize' ? 'renormalize' : null,
    });
  });
  return out.length ? out : null;
}

// applyProposalToSyllabusDraft + mergeIntoSetupDraft patched below
export function applyProposalToSyllabusDraft(
  draft: SyllabusWizardDraft,
  proposal: IngestProposal,
  acceptedPaths?: Set<string>,
): SyllabusWizardDraft {
  const next = { ...draft, source: 'ask_import' as const };
  const locked = (field: keyof typeof draft.locks) => draft.locks[field] === true;
  for (const f of proposal.fields) {
    if (acceptedPaths && !acceptedPaths.has(f.path)) continue;
    if (f.status === 'unknown' || f.status === 'conflict') continue;
    if (f.confidence < 0.5) continue;
    // Lock wins — skip applying conflicting AI values (FR-AI lock rule).
    if (f.path === 'syllabus.engine' && locked('engine')) continue;
    if (f.path === 'syllabus.within_category' && locked('engine')) continue;
    if (f.path === 'syllabus.categories' && (locked('categories') || locked('drop_lowest'))) continue;
    if (f.path === 'syllabus.late_rule' && locked('late')) continue;
    if (f.path === 'syllabus.floor' && locked('floor')) continue;
    if (f.path === 'syllabus.book_mode' && locked('book_mode')) continue;
    if (f.path === 'syllabus.retake' && locked('retake')) continue;
    if (f.path === 'syllabus.assignment_max' && locked('assignment_max')) continue;
    if (
      (f.path === 'syllabus.rollup_preset' || f.path === 'syllabus.exam_weight') &&
      locked('rollup')
    ) {
      continue;
    }
    switch (f.path) {
      case 'syllabus.title':
        if (typeof f.value === 'string') next.title = f.value;
        break;
      case 'syllabus.engine':
        if (
          f.value === 'total_points' ||
          f.value === 'weighted_points_inside' ||
          f.value === 'weighted_percent_inside' ||
          f.value === 'item_weights' ||
          f.value === 'none'
        ) {
          next.engine = f.value;
        }
        break;
      case 'syllabus.within_category':
        if (f.value === 'points_inside' || f.value === 'percent_inside') next.within_category = f.value;
        else if (f.value == null) next.within_category = null;
        break;
      case 'syllabus.categories': {
        const cats = asCategories(f.value);
        if (cats) next.categories = cats;
        break;
      }
      case 'syllabus.late_rule':
        next.late_rule = asLateRule(f.value);
        break;
      case 'syllabus.missing_rule':
        if (f.value === 'zero' || f.value === 'floor' || f.value === 'omit') next.missing_rule = f.value;
        else if (f.value && typeof f.value === 'object') {
          const t = (f.value as { type?: string }).type;
          if (t === 'zero' || t === 'floor' || t === 'omit') next.missing_rule = t;
        }
        break;
      case 'syllabus.extra_credit_method':
        if (f.value === 'A' || f.value === 'B' || f.value === 'C') next.extra_credit_method = f.value;
        break;
      case 'syllabus.ec_cap':
        next.ec_cap = f.value == null ? null : Number(f.value);
        break;
      case 'syllabus.floor':
        next.floor = f.value == null ? null : Number(f.value);
        break;
      case 'syllabus.ceiling':
        next.ceiling = f.value == null ? null : Number(f.value);
        break;
      case 'syllabus.book_mode':
        if (f.value === 'reset_each_marking_period' || f.value === 'rolling_year') next.book_mode = f.value;
        break;
      case 'syllabus.exam_weight':
        next.exam_weight = f.value == null ? null : Number(f.value);
        break;
      case 'syllabus.rollup_preset':
        next.rollup_preset = f.value == null ? null : String(f.value);
        break;
      case 'syllabus.rounding':
        if (
          f.value === 'nearest_whole' ||
          f.value === 'half_up' ||
          f.value === 'truncate' ||
          f.value === 'none'
        ) {
          next.rounding = f.value;
        }
        break;
      case 'syllabus.empty_category':
        if (f.value === 'renormalize' || f.value === 'zero') next.empty_category = f.value;
        break;
      case 'syllabus.term_structure':
        if (
          f.value === 'quarters' ||
          f.value === 'semesters' ||
          f.value === 'year' ||
          f.value === 'custom'
        ) {
          next.term_structure = f.value;
        }
        break;
      default:
        break;
    }
  }
  return next;
}

export function mergeIntoSetupDraft(
  setup: SetupDraft,
  proposal: IngestProposal,
  opts: MergeOptions = {},
): { setup: SetupDraft; result: MergeResult } {
  const ingestable = asIngestableDraft('school_grading_policy', setup.fields);
  const result = mergeProposalIntoDraft(ingestable, proposal, opts);
  const fields: Record<string, SetupDraftField> = {};
  for (const [path, f] of Object.entries(result.draft.fields)) {
    fields[path] = {
      value: f.value,
      source: f.source === 'ingest' ? 'ai' : (f.source as SetupDraftField['source']),
      confidence: f.confidence,
      evidence: f.evidence,
    };
  }
  return { setup: { ...setup, fields, updated_at: new Date().toISOString() }, result };
}
