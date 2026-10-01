/**
 * Apply extracted slots onto school SetupDraft / syllabus draft bag.
 * AI never publishes — draft only.
 */
import {
  applyLevelDefaults,
  createEmptyDraft,
  defaultGpaProfiles,
  defaultRollupForTemplate,
  getFieldValue,
  makeCalendar,
  rebuildCalendarFromDraft,
  setField,
  type SchoolLevelChoice,
  type SetupDraft,
  type GpaMode,
  type CreditPolicy,
} from '../school/gradingPolicy.ts';
import { makeScaleFromTemplate, type GradeScale } from '../grade/scale/scale.ts';
import { DEFAULT_COURSE_LEVELS, type CourseLevel, type GpaProfile } from '../grade/gpa/gpa.ts';
import type { TemplateKey } from '../grade/calendar/types.ts';
import { qualityTablesForMethod } from '../school/gradingPolicy.ts';
import { createEmptyWizardDraft, type SyllabusWizardDraft } from '../../components/syllabus/wizardModel.ts';
import { defaultSlotsFor, getNode } from './graph.ts';
import type { ExtractedSlot, FilledSlot, InterviewSession, InterviewWizard, SlotSource } from './types.ts';

function nowIso(): string {
  return new Date().toISOString();
}

export function emptySchoolDraftBag(schoolId: string): Record<string, unknown> {
  return createEmptyDraft(schoolId || 'school-pending', 'high') as unknown as Record<string, unknown>;
}

export function emptySyllabusDraftBag(classId: string): Record<string, unknown> {
  return createEmptyWizardDraft(classId || 'class-pending') as unknown as Record<string, unknown>;
}

export function markFilled(
  filled: Record<string, FilledSlot>,
  path: string,
  value: unknown,
  source: SlotSource,
  confidence: number | null = 0.9,
  evidence: string | null = null,
): Record<string, FilledSlot> {
  return {
    ...filled,
    [path]: { value, source, confidence, evidence },
  };
}

export function applySlotsToFilled(
  filled: Record<string, FilledSlot>,
  slots: ExtractedSlot[],
  source: SlotSource,
): Record<string, FilledSlot> {
  let next = { ...filled };
  for (const s of slots) {
    if (!s.path) continue;
    next = markFilled(next, s.path, s.value, source, s.confidence ?? 0.85, s.evidence ?? null);
  }
  return next;
}

function patchDefaultScale(draft: SetupDraft, patch: Partial<GradeScale>, fs: 'user' | 'assumed' | 'ai'): SetupDraft {
  const list = getFieldValue<GradeScale[]>(draft, 'scale.list', []);
  const id = getFieldValue<string>(draft, 'scale.default_id', list[0]?.id ?? '');
  if (!list.length) return draft;
  const next = list.map((sc) => (sc.id === id || list.length === 1 ? { ...sc, ...patch } : sc));
  return setField(draft, 'scale.list', next, fs);
}

function invertExclude(v: unknown): Record<string, boolean> {
  const o = (v ?? {}) as Record<string, boolean>;
  return Object.fromEntries(Object.entries(o).map(([k, x]) => [k, !x]));
}

/** Push gpa.include / gpa.repeat answers into every GPA profile (payload.gpa_profiles). */
function reapplyProfileOptions(draft: SetupDraft, fs: 'user' | 'assumed' | 'ai'): SetupDraft {
  const profiles = getFieldValue<GpaProfile[]>(draft, 'gpa.profiles', []);
  if (!profiles.length) return draft;
  const inc = draft.fields['gpa.include']?.value as Record<string, boolean> | undefined;
  const rep = draft.fields['gpa.repeat']?.source === 'default' ? undefined : (draft.fields['gpa.repeat']?.value as GpaProfile['repeat'] | undefined);
  const next = profiles.map((p) => ({
    ...p,
    include: inc ? { ...p.include, ...inc } : p.include,
    repeat: rep ?? p.repeat,
  }));
  return setField(draft, 'gpa.profiles', next, fs);
}

/** Weighting chart → course level bonuses + quality-point method/tables (payload.course_levels / quality_point_tables). */
function applyWeighting(draft: SetupDraft, chart: string, fs: 'user' | 'assumed' | 'ai'): SetupDraft {
  let next = draft;
  const levels: CourseLevel[] = DEFAULT_COURSE_LEVELS.map((l) => ({ ...l }));
  if (chart === 'none') {
    next = setField(next, 'levels.list', levels.map((l) => ({ ...l, weighted_bonus: 0 })), fs);
    next = setField(next, 'qp.method', 'letter_map', fs);
    next = setField(next, 'qp.tables', qualityTablesForMethod('letter_map'), fs);
  } else if (chart === 'numeric_5' || chart === 'numeric_6') {
    next = setField(next, 'levels.list', levels, fs);
    next = setField(next, 'qp.method', 'numeric_band', fs);
    next = setField(next, 'qp.tables', qualityTablesForMethod('numeric_band'), fs);
  } else {
    next = setField(next, 'levels.list', levels, fs);
    next = setField(next, 'qp.method', 'letter_map', fs);
    next = setField(next, 'qp.tables', qualityTablesForMethod('letter_map'), fs);
  }
  return next;
}

export function applySchoolSlots(
  draftBag: Record<string, unknown>,
  slots: ExtractedSlot[],
  source: SlotSource,
): SetupDraft {
  let draft = draftBag as unknown as SetupDraft;
  if (!draft || draft.kind !== 'school_grading_policy') {
    draft = createEmptyDraft(String((draftBag as { school_id?: string })?.school_id ?? 'school-pending'), 'high');
  }
  const fs = source === 'assumed' ? 'assumed' : source === 'ai' ? 'ai' : 'user';

  for (const s of slots) {
    const path = s.path;
    const val = s.value;
    if (path === 'level') {
      draft = applyLevelDefaults(draft, val as SchoolLevelChoice);
      draft = setField(draft, 'level', val, fs);
    } else if (path === 'calendar.template') {
      const template = val as TemplateKey;
      draft = setField(draft, 'calendar.template', template, fs);
      const level = getFieldValue<SchoolLevelChoice>(draft, 'level', 'high');
      const yearStart = getFieldValue<string>(draft, 'calendar.year_start', `${new Date().getFullYear()}-08-15`);
      const yearEnd = getFieldValue<string>(draft, 'calendar.year_end', `${new Date().getFullYear() + 1}-05-28`);
      const preset = defaultRollupForTemplate(template);
      draft = setField(draft, 'rollup.preset', preset, 'template');
      const cal = makeCalendar({
        school_id: draft.school_id,
        level,
        template,
        year_start: yearStart,
        year_end: yearEnd,
        rollup_preset: preset,
      });
      draft = setField(draft, 'calendar.model', cal, 'template');
    } else if (path === 'credit.policy') {
      const prev = getFieldValue<CreditPolicy | null>(draft, 'credit.policy', null);
      const next = { ...(val as CreditPolicy) };
      if (next.exam_exemption == null && prev?.exam_exemption) next.exam_exemption = prev.exam_exemption;
      draft = setField(draft, 'credit.policy', next, fs);
    } else if (path === 'rollup.preset') {
      draft = setField(draft, 'rollup.preset', val, fs);
      draft = rebuildCalendarFromDraft(draft);
    } else if (path === 'scale.default_id') {
      const scale = makeScaleFromTemplate(String(val));
      draft = setField(draft, 'scale.default_id', scale.id, fs);
      draft = setField(draft, 'scale.list', [scale], fs);
      // Keep earlier passing / rounding answers when the scale changes.
      const pass = draft.fields['scale.passing_pct'];
      if (pass && pass.source !== 'default' && pass.source !== 'template') {
        draft = patchDefaultScale(draft, { passing_pct: Number(pass.value) }, fs);
      }
      const rnd = draft.fields['scale.rounding'];
      if (rnd && rnd.source !== 'default' && rnd.source !== 'template') {
        draft = patchDefaultScale(draft, { rounding: rnd.value as GradeScale['rounding'] }, fs);
      }
    } else if (path === 'scale.passing_pct' || path === 'scale.rounding') {
      // Lives on the default scale object (payload.scales[].passing_pct / rounding).
      draft = setField(draft, path, val, fs);
      draft = patchDefaultScale(draft, path === 'scale.passing_pct' ? { passing_pct: Number(val) } : { rounding: val as GradeScale['rounding'] }, fs);
    } else if (path === 'gpa.mode') {
      const mode = val as GpaMode;
      draft = setField(draft, 'gpa.mode', mode, fs);
      draft = setField(draft, 'gpa.profiles', defaultGpaProfiles(mode), fs);
      draft = reapplyProfileOptions(draft, fs);
    } else if (path === 'gpa.weighted_bonus' || path === 'levels.ap_points') {
      draft = setField(draft, path, val, fs);
      const mode = getFieldValue<GpaMode>(draft, 'gpa.mode', 'unweighted');
      if (mode === 'unweighted' || mode === 'off') {
        draft = setField(draft, 'gpa.mode', 'unweighted_and_weighted' as GpaMode, fs);
        draft = setField(draft, 'gpa.profiles', defaultGpaProfiles('unweighted_and_weighted'), fs);
        draft = reapplyProfileOptions(draft, fs);
      }
      if (path === 'gpa.weighted_bonus') draft = applyWeighting(draft, String(val), fs);
    } else if (path === 'gpa.include' || path === 'gpa.exclude') {
      const inc = path === 'gpa.exclude' ? invertExclude(val) : (val as Record<string, boolean>);
      draft = setField(draft, 'gpa.include', inc, fs);
      draft = reapplyProfileOptions(draft, fs);
    } else if (path === 'gpa.repeat') {
      draft = setField(draft, 'gpa.repeat', val, fs);
      draft = reapplyProfileOptions(draft, fs);
    } else if (path === 'credit.exam_exemption') {
      const credit = getFieldValue<CreditPolicy>(draft, 'credit.policy', { unit: 'semester_0_5', year_link: true, attendance_gate: true });
      draft = setField(draft, 'credit.exam_exemption', val, fs);
      draft = setField(draft, 'credit.policy', { ...credit, exam_exemption: val as CreditPolicy['exam_exemption'] }, fs);
    } else if (path === 'calendar.year_start' || path === 'calendar.year_end') {
      draft = setField(draft, path, val, fs);
      draft = rebuildCalendarFromDraft(draft);
    } else if (path === 'locks.map') {
      draft = setField(draft, path, val, fs);
    } else {
      draft = setField(draft, path, val, fs);
    }
  }
  return { ...draft, updated_at: nowIso() };
}

/**
 * Apply interview slots onto a SyllabusWizardDraft-shaped bag (live preview).
 * Paths are SyllabusWizardDraft keys; school locks win (FR-CHAT-21).
 */
export function applySyllabusSlots(
  draftBag: Record<string, unknown>,
  slots: ExtractedSlot[],
): Record<string, unknown> {
  const next = { ...draftBag } as unknown as SyllabusWizardDraft & Record<string, unknown>;
  const locksRaw = (draftBag.locks ?? {}) as Record<string, boolean>;
  const locked = (key: string) => locksRaw[key] === true;

  const blockedPaths = new Set<string>(['calendar.template', 'calendar.model', 'scale.passing_pct']);
  if (locked('categories')) blockedPaths.add('categories');
  if (locked('engine')) {
    blockedPaths.add('engine');
    blockedPaths.add('within_category');
  }
  if (locked('late')) blockedPaths.add('late_rule');
  if (locked('floor')) blockedPaths.add('floor');
  if (locked('drop_lowest')) blockedPaths.add('drop_lowest');
  if (locked('retake')) blockedPaths.add('retake');
  if (locked('book_mode')) blockedPaths.add('book_mode');
  if (locked('rollup')) {
    blockedPaths.add('rollup_preset');
    blockedPaths.add('exam_weight');
  }

  for (const s of slots) {
    if (!s.path) continue;
    if (blockedPaths.has(s.path)) continue;
    const v = s.value;
    switch (s.path) {
      case 'categories': {
        if (!Array.isArray(v)) break;
        const prev = new Map((next.categories ?? []).map((c) => [c.key, c]));
        next.categories = (v as Array<{ key: string; label: string; weight_percent: number }>).map((c, i) => {
          const old = prev.get(c.key);
          const base = old ?? {
            key: c.key,
            label: c.label,
            weight_percent: 0,
            sort_order: i,
            active: true,
            group: null,
            default_include_in_average: true,
            min_grades_per_term: null,
            rules: { drop_lowest_n: 0, replace_lowest_with_makeup: { enabled: false, max_replacements: 1 } },
            drop_highest_n: 0,
            keep_highest_n: null,
            droppable: true,
            never_drop_flags: [],
            empty_policy: null,
          };
          return { ...base, key: c.key, label: c.label, weight_percent: Number(c.weight_percent), sort_order: i, active: true };
        });
        break;
      }
      case 'drop_lowest': {
        const map = (v ?? {}) as Record<string, number>;
        next.categories = (next.categories ?? []).map((c) => ({
          ...c,
          rules: { ...c.rules, drop_lowest_n: Math.max(0, Number(map[c.key] ?? 0)) },
        }));
        break;
      }
      case 'engine':
        next.engine = v as SyllabusWizardDraft['engine'];
        if (v === 'weighted_points_inside') next.within_category = 'points_inside';
        else if (v === 'weighted_percent_inside') next.within_category = 'percent_inside';
        else next.within_category = null;
        break;
      case 'missing_rule':
        // legacy chip value floor_50
        if (v === 'floor_50') {
          next.missing_rule = 'floor';
          next.floor = 50;
        } else next.missing_rule = v as SyllabusWizardDraft['missing_rule'];
        break;
      case 'extra_credit_allowed':
        next.policies = { ...next.policies, extra_credit_allowed: v === true };
        break;
      case 'empty_category':
        next.empty_category = v === 'zero' ? 'zero' : 'renormalize';
        next.categories = (next.categories ?? []).map((c) => ({ ...c, empty_policy: next.empty_category }));
        break;
      case 'rounding':
        next.rounding = v as SyllabusWizardDraft['rounding'];
        next.policies = { ...next.policies, rounding: v === 'none' ? 'none' : 'nearest_whole' };
        break;
      default:
        (next as Record<string, unknown>)[s.path] = v;
    }
  }
  return next as unknown as Record<string, unknown>;
}

export function applySlotsToSession(
  session: InterviewSession,
  slots: ExtractedSlot[],
  source: SlotSource,
): InterviewSession {
  const filled = applySlotsToFilled(session.filled, slots, source);
  let draft = session.draft;
  if (session.wizard === 'school') {
    draft = applySchoolSlots(draft, slots, source) as unknown as Record<string, unknown>;
  } else {
    draft = applySyllabusSlots(draft, slots);
  }
  return { ...session, filled, draft, updated_at: nowIso() };
}

export function notSureDefaults(session: InterviewSession, nodeId: string): ExtractedSlot[] {
  if (session.wizard === 'school') {
    if (nodeId === 'S-Q2') {
      const level = String(session.filled.level?.value ?? 'high');
      const template =
        level === 'elementary'
          ? 'elementary_year_4'
          : level === 'middle'
            ? 'nine_weeks'
            : level === 'college'
              ? 'college_term'
              : 'tx_six_weeks';
      return [{ path: 'calendar.template', value: template, confidence: 0.6, evidence: 'assumed default for level' }];
    }
    if (nodeId === 'S-Q3') {
      return [
        {
          path: 'credit.policy',
          value: { unit: 'semester_0_5', year_link: true, attendance_gate: true },
          confidence: 0.6,
          evidence: 'assumed',
        },
      ];
    }
    if (nodeId === 'S-Q4') {
      const t = String(session.filled['calendar.template']?.value ?? 'tx_six_weeks');
      const preset = t === 'tx_six_weeks' ? '2/7+1/7' : t === 'nine_weeks' ? '40/40/20' : '50/50';
      return [{ path: 'rollup.preset', value: preset, confidence: 0.6, evidence: 'assumed' }];
    }
    if (nodeId === 'S-Q6') {
      return [
        { path: 'scale.default_id', value: 'texas_no_d', confidence: 0.6, evidence: 'assumed' },
        { path: 'scale.passing_pct', value: 70, confidence: 0.6, evidence: 'assumed' },
      ];
    }
    if (nodeId === 'S-Q7') {
      return [{ path: 'gpa.mode', value: 'unweighted_and_weighted', confidence: 0.6, evidence: 'assumed' }];
    }
  }
  const node = getNode(session.wizard, nodeId);
  if (!node) return [];
  return defaultSlotsFor(node, { wizard: session.wizard, filled: session.filled, draft: session.draft });
}

const LOCK_SEED_PATHS: Record<string, string[]> = {
  engine: ['engine', 'within_category'],
  categories: ['categories'],
  late: ['late_rule'],
  floor: ['floor'],
  drop_lowest: ['drop_lowest'],
  retake: ['retake'],
  book_mode: ['book_mode'],
  rollup: ['exam_weight', 'rollup_preset'],
};

/**
 * Skip what is already known: school-locked syllabus fields are pre-filled
 * (source assumed, evidence "school lock") and the class name becomes the title.
 */
export function seedSyllabusFilled(draft: Record<string, unknown>, className: string | null): Record<string, FilledSlot> {
  let filled: Record<string, FilledSlot> = {};
  const locks = (draft.locks ?? {}) as Record<string, boolean>;
  for (const [lock, paths] of Object.entries(LOCK_SEED_PATHS)) {
    if (locks[lock] !== true) continue;
    for (const p of paths) {
      let v: unknown = draft[p] ?? null;
      if (p === 'drop_lowest') {
        const cats = (draft.categories ?? []) as Array<{ key: string; rules?: { drop_lowest_n?: number } }>;
        v = Object.fromEntries(cats.filter((c) => Number(c.rules?.drop_lowest_n ?? 0) > 0).map((c) => [c.key, Number(c.rules?.drop_lowest_n)]));
      }
      filled = markFilled(filled, p, v, 'assumed', 1, 'school lock');
    }
  }
  const title = String(draft.title ?? '').trim() || String(className ?? '').trim();
  if (title) filled = markFilled(filled, 'title', title, 'assumed', 1, 'class name');
  return filled;
}

export function createSession(input: {
  wizard: InterviewWizard;
  school_id?: string | null;
  class_id?: string | null;
  owner_id?: string | null;
  id?: string;
  existing_draft?: Record<string, unknown> | null;
  /** Class name — pre-fills the syllabus title so the question is skipped. */
  class_name?: string | null;
}): InterviewSession {
  const id = input.id ?? `iv-${Math.random().toString(36).slice(2, 10)}`;
  const draft =
    input.existing_draft ??
    (input.wizard === 'school'
      ? emptySchoolDraftBag(input.school_id ?? '')
      : emptySyllabusDraftBag(input.class_id ?? ''));
  const now = nowIso();
  const first = input.wizard === 'school' ? 'S-Q1' : 'T-Q1';
  return {
    id,
    wizard: input.wizard,
    draft_id: null,
    school_id: input.school_id ?? null,
    class_id: input.class_id ?? null,
    owner_id: input.owner_id ?? null,
    asked: [],
    filled: input.wizard === 'syllabus' ? seedSyllabusFilled(draft, input.class_name ?? null) : {},
    next_node: first,
    pending_node: first,
    failed_parses: {},
    draft,
    status: 'active',
    transcript: [],
    section_index: 0,
    base_draft: input.existing_draft ?? null,
    class_name: input.class_name ?? null,
    created_at: now,
    updated_at: now,
  };
}
