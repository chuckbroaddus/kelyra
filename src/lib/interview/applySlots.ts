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
import { makeScaleFromTemplate } from '../grade/scale/scale.ts';
import type { TemplateKey } from '../grade/calendar/types.ts';
import type { ExtractedSlot, FilledSlot, InterviewSession, InterviewWizard, SlotSource } from './types.ts';

function nowIso(): string {
  return new Date().toISOString();
}

export function emptySchoolDraftBag(schoolId: string): Record<string, unknown> {
  return createEmptyDraft(schoolId || 'school-pending', 'high') as unknown as Record<string, unknown>;
}

export function emptySyllabusDraftBag(classId: string): Record<string, unknown> {
  return {
    class_id: classId || 'class-pending',
    step: 'engine',
    title: '',
    engine: 'weighted_percent_inside',
    within_category: 'percent_inside',
    categories: [
      { key: 'tests', label: 'Tests', weight_percent: 50 },
      { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
      { key: 'homework', label: 'Homework', weight_percent: 30 },
    ],
    missing_rule: 'omit',
    late_rule: { type: 'none' },
    drop_lowest: 0,
    extra_credit: false,
    retakes: false,
    book_mode: 'reset_each_marking_period',
    extra_credit_method: 'B',
    locks: {},
  };
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
      draft = setField(draft, 'credit.policy', val as CreditPolicy, fs);
    } else if (path === 'rollup.preset') {
      draft = setField(draft, 'rollup.preset', val, fs);
      draft = rebuildCalendarFromDraft(draft);
    } else if (path === 'scale.default_id') {
      const scale = makeScaleFromTemplate(String(val));
      draft = setField(draft, 'scale.default_id', scale.id, fs);
      draft = setField(draft, 'scale.list', [scale], fs);
    } else if (path === 'scale.passing_pct') {
      draft = setField(draft, 'scale.passing_pct', val, fs);
    } else if (path === 'gpa.mode') {
      const mode = val as GpaMode;
      draft = setField(draft, 'gpa.mode', mode, fs);
      draft = setField(draft, 'gpa.profiles', defaultGpaProfiles(mode), fs);
    } else if (path === 'gpa.weighted_bonus' || path === 'levels.ap_points') {
      draft = setField(draft, path, val, fs);
      const mode = getFieldValue<GpaMode>(draft, 'gpa.mode', 'unweighted');
      if (mode === 'unweighted' || mode === 'off') {
        draft = setField(draft, 'gpa.mode', 'unweighted_and_weighted' as GpaMode, fs);
        draft = setField(draft, 'gpa.profiles', defaultGpaProfiles('unweighted_and_weighted'), fs);
      }
    } else if (path === 'gpa.exclude' || path === 'exam.separate' || path === 'locks.map') {
      draft = setField(draft, path, val, fs);
    } else {
      draft = setField(draft, path, val, fs);
    }
  }
  return { ...draft, updated_at: nowIso() };
}

export function applySyllabusSlots(
  draftBag: Record<string, unknown>,
  slots: ExtractedSlot[],
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...draftBag };
  const locksRaw = (draftBag.locks ?? {}) as Record<string, boolean>;
  const locked = (key: string) => locksRaw[key] === true;

  // FR-CHAT-21: teacher interview cannot change school calendar, passing mark, or locked weights.
  const blockedPaths = new Set<string>(['calendar.template', 'calendar.model', 'scale.passing_pct']);
  if (locked('categories') || locked('weights')) {
    blockedPaths.add('categories');
    blockedPaths.add('syllabus.categories');
  }
  if (locked('engine')) {
    blockedPaths.add('engine');
    blockedPaths.add('syllabus.engine');
  }
  if (locked('late')) {
    blockedPaths.add('late_rule');
    blockedPaths.add('syllabus.late_rule');
  }
  if (locked('floor')) {
    blockedPaths.add('floor');
    blockedPaths.add('syllabus.floor');
  }
  if (locked('drop_lowest')) blockedPaths.add('drop_lowest');
  if (locked('retake')) {
    blockedPaths.add('retake');
    blockedPaths.add('retakes');
  }
  if (locked('book_mode')) blockedPaths.add('book_mode');
  if (locked('rollup')) {
    blockedPaths.add('rollup_preset');
    blockedPaths.add('exam_weight');
  }
  if (locked('scale')) {
    blockedPaths.add('scale.default_id');
    blockedPaths.add('scale.passing_pct');
  }

  for (const s of slots) {
    if (!s.path) continue;
    if (blockedPaths.has(s.path)) continue;
    if (s.path === 'categories' && Array.isArray(s.value)) {
      next.categories = s.value;
    } else if (s.path === 'engine') {
      next.engine = s.value;
      if (s.value === 'weighted_points_inside') next.within_category = 'points_inside';
      if (s.value === 'weighted_percent_inside') next.within_category = 'percent_inside';
    } else if (s.path === 'missing_rule') {
      next.missing_rule = s.value === 'floor_50' ? 'floor' : s.value;
      if (s.value === 'floor_50') next.floor = 50;
    } else if (s.path === 'extra_credit') {
      next.extra_credit = s.value;
      next.extra_credit_method = s.value ? 'B' : 'none';
    } else if (s.path === 'drop_lowest') {
      next.drop_lowest = s.value;
    } else {
      next[s.path] = s.value;
    }
  }
  return next;
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
  } else {
    if (nodeId === 'T-Q1') {
      return [{ path: 'engine', value: 'weighted_percent_inside', confidence: 0.6, evidence: 'K-12 default' }];
    }
    if (nodeId === 'T-Q2') {
      return [
        {
          path: 'categories',
          value: [
            { key: 'tests', label: 'Tests', weight_percent: 50 },
            { key: 'quizzes', label: 'Quizzes', weight_percent: 20 },
            { key: 'homework', label: 'Homework', weight_percent: 30 },
          ],
          confidence: 0.6,
          evidence: 'assumed',
        },
      ];
    }
    if (nodeId === 'T-Q3') {
      return [{ path: 'within_category', value: 'percent_inside', confidence: 0.6, evidence: 'assumed' }];
    }
    if (nodeId === 'T-Q5') {
      return [{ path: 'late_rule', value: { type: 'none' }, confidence: 0.6, evidence: 'assumed' }];
    }
  }
  return [];
}

export function createSession(input: {
  wizard: InterviewWizard;
  school_id?: string | null;
  class_id?: string | null;
  owner_id?: string | null;
  id?: string;
  existing_draft?: Record<string, unknown> | null;
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
    filled: {},
    next_node: first,
    pending_node: first,
    failed_parses: {},
    draft,
    status: 'active',
    transcript: [],
    section_index: 0,
    created_at: now,
    updated_at: now,
  };
}
