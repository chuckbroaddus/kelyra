/**
 * Canonical work_kind vocabulary (GWT).
 * work_kind = what the work is; category = syllabus / grade-book bucket.
 */
import type { ScoreScheme } from './marks.ts';

export type WorkKind =
  | 'homework'
  | 'classwork'
  | 'warmup'
  | 'exit_ticket'
  | 'quiz'
  | 'pop_quiz'
  | 'test'
  | 'exam'
  | 'project'
  | 'lab'
  | 'essay'
  | 'presentation'
  | 'practice'
  | 'participation'
  | 'behavior'
  | 'effort'
  | 'memory_verse'
  | 'bible_quiz'
  | 'reading_log'
  | 'other';

export type WorkKindDef = {
  key: WorkKind;
  label: string;
  defaultCategory: string;
  defaultCategoryLabel: string;
  defaultScoreScheme: ScoreScheme;
  defaultIncludeInAverage: boolean;
  defaultCalendarPublished: boolean;
  captureAiDraft: boolean;
  christianPreset?: boolean;
};

const PROCESS = {
  defaultIncludeInAverage: false as boolean,
  captureAiDraft: false as boolean,
  defaultScoreScheme: 'complete_incomplete' as ScoreScheme,
};

export const WORK_KINDS: WorkKindDef[] = [
  {
    key: 'homework',
    label: 'Homework',
    defaultCategory: 'homework',
    defaultCategoryLabel: 'Homework',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'classwork',
    label: 'Classwork',
    defaultCategory: 'classwork',
    defaultCategoryLabel: 'Classwork',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'warmup',
    label: 'Warm-up',
    defaultCategory: 'classwork',
    defaultCategoryLabel: 'Classwork',
    defaultScoreScheme: 'complete_incomplete',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'exit_ticket',
    label: 'Exit ticket',
    defaultCategory: 'classwork',
    defaultCategoryLabel: 'Classwork',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'quiz',
    label: 'Quiz',
    defaultCategory: 'quiz',
    defaultCategoryLabel: 'Quizzes',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: false,
    captureAiDraft: true,
  },
  {
    key: 'pop_quiz',
    label: 'Pop quiz',
    defaultCategory: 'quiz',
    defaultCategoryLabel: 'Quizzes',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: false,
    captureAiDraft: true,
  },
  {
    key: 'test',
    label: 'Test',
    defaultCategory: 'test',
    defaultCategoryLabel: 'Tests',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: false,
    captureAiDraft: true,
  },
  {
    key: 'exam',
    label: 'Exam',
    defaultCategory: 'exam',
    defaultCategoryLabel: 'Exams',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: false,
    captureAiDraft: true,
  },
  {
    key: 'project',
    label: 'Project',
    defaultCategory: 'project',
    defaultCategoryLabel: 'Projects',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'lab',
    label: 'Lab',
    defaultCategory: 'lab',
    defaultCategoryLabel: 'Labs',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'essay',
    label: 'Essay',
    defaultCategory: 'essay',
    defaultCategoryLabel: 'Essays',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'presentation',
    label: 'Presentation',
    defaultCategory: 'presentation',
    defaultCategoryLabel: 'Presentations',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: false,
  },
  {
    key: 'practice',
    label: 'Practice',
    defaultCategory: 'practice',
    defaultCategoryLabel: 'Practice',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'participation',
    label: 'Participation',
    defaultCategory: 'participation',
    defaultCategoryLabel: 'Participation',
    defaultCalendarPublished: true,
    ...PROCESS,
  },
  {
    key: 'behavior',
    label: 'Behavior',
    defaultCategory: 'behavior',
    defaultCategoryLabel: 'Behavior',
    defaultCalendarPublished: true,
    defaultScoreScheme: 'esnu',
    defaultIncludeInAverage: false,
    captureAiDraft: false,
  },
  {
    key: 'effort',
    label: 'Effort',
    defaultCategory: 'effort',
    defaultCategoryLabel: 'Effort',
    defaultCalendarPublished: true,
    defaultScoreScheme: 'esnu',
    defaultIncludeInAverage: false,
    captureAiDraft: false,
  },
  {
    key: 'memory_verse',
    label: 'Memory verse',
    defaultCategory: 'memory_verse',
    defaultCategoryLabel: 'Memory verse',
    defaultScoreScheme: 'complete_incomplete',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
    christianPreset: true,
  },
  {
    key: 'bible_quiz',
    label: 'Bible quiz',
    defaultCategory: 'bible_quiz',
    defaultCategoryLabel: 'Bible quiz',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: false,
    captureAiDraft: true,
    christianPreset: true,
  },
  {
    key: 'reading_log',
    label: 'Reading log',
    defaultCategory: 'reading_log',
    defaultCategoryLabel: 'Reading log',
    defaultScoreScheme: 'complete_incomplete',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
  {
    key: 'other',
    label: 'Other',
    defaultCategory: 'other',
    defaultCategoryLabel: 'Other',
    defaultScoreScheme: 'numeric',
    defaultIncludeInAverage: true,
    defaultCalendarPublished: true,
    captureAiDraft: true,
  },
];

const BY_KEY = new Map(WORK_KINDS.map((row) => [row.key, row] as const));

const LEGACY_ALIAS: Record<string, WorkKind> = {
  midterm: 'exam',
  final: 'exam',
  memorization: 'memory_verse',
  exit: 'exit_ticket',
  'exit-ticket': 'exit_ticket',
  'pop-quiz': 'pop_quiz',
  'warm-up': 'warmup',
  warm_up: 'warmup',
  'memory-verse': 'memory_verse',
  'bible-quiz': 'bible_quiz',
  'reading-log': 'reading_log',
};

export function isWorkKind(value: string | null | undefined): value is WorkKind {
  return Boolean(value && BY_KEY.has(value as WorkKind));
}

export function parseWorkKind(value: string | null | undefined): WorkKind {
  if (!value) return 'homework';
  const raw = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (isWorkKind(raw)) return raw;
  const aliased = LEGACY_ALIAS[raw];
  if (aliased) return aliased;
  return 'other';
}

export function workKindDef(value: string | null | undefined): WorkKindDef {
  return BY_KEY.get(parseWorkKind(value)) ?? BY_KEY.get('other')!;
}

export function workKindLabel(value: string | null | undefined): string {
  return workKindDef(value).label;
}

export function defaultCategoryForWorkKind(kind: string | null | undefined): string {
  return workKindDef(kind).defaultCategory;
}

export function defaultScoreSchemeForWorkKind(kind: string | null | undefined): ScoreScheme {
  return workKindDef(kind).defaultScoreScheme;
}

export function defaultIncludeInAverageForWorkKind(kind: string | null | undefined): boolean {
  return workKindDef(kind).defaultIncludeInAverage;
}

export function defaultCalendarPublishedForWorkKind(kind: string | null | undefined): boolean {
  return workKindDef(kind).defaultCalendarPublished;
}

export function christianWorkKindPresets(): WorkKindDef[] {
  return WORK_KINDS.filter((row) => row.christianPreset);
}

/** Map work kind onto best matching published syllabus category key. */
export function mapWorkKindToSyllabusCategory(
  kind: string | null | undefined,
  categories: Array<{ key: string; label: string; active?: boolean }>,
): string | null {
  const active = categories.filter((c) => c.active !== false);
  if (!active.length) return null;
  const def = workKindDef(kind);
  const exact = active.find((c) => c.key === def.defaultCategory || c.key === def.key);
  if (exact) return exact.key;
  const labelHit = active.find(
    (c) =>
      c.label.trim().toLowerCase() === def.defaultCategoryLabel.toLowerCase() ||
      c.label.trim().toLowerCase() === def.label.toLowerCase(),
  );
  if (labelHit) return labelHit.key;
  const soft = active.find((c) => {
    const L = c.label.toLowerCase();
    return L.includes(def.label.toLowerCase()) || def.label.toLowerCase().includes(L.replace(/s$/, ''));
  });
  if (soft) return soft.key;
  return active[0]!.key;
}

/** Seed category rows from work kinds (one row per defaultCategory). */
export function seedSyllabusCategoriesFromWorkKinds(existingKeys: Set<string> = new Set()): Array<{
  key: string;
  label: string;
  default_include_in_average: boolean;
  default_score_scheme: ScoreScheme;
  suggested_work_kinds: WorkKind[];
}> {
  const byCat = new Map<
    string,
    {
      key: string;
      label: string;
      default_include_in_average: boolean;
      default_score_scheme: ScoreScheme;
      suggested_work_kinds: WorkKind[];
    }
  >();
  for (const wk of WORK_KINDS) {
    if (existingKeys.has(wk.defaultCategory)) continue;
    const prev = byCat.get(wk.defaultCategory);
    if (prev) {
      prev.suggested_work_kinds.push(wk.key);
      continue;
    }
    byCat.set(wk.defaultCategory, {
      key: wk.defaultCategory,
      label: wk.defaultCategoryLabel,
      default_include_in_average: wk.defaultIncludeInAverage,
      default_score_scheme: wk.defaultScoreScheme,
      suggested_work_kinds: [wk.key],
    });
  }
  return [...byCat.values()];
}

export function parseSpokenWorkKind(text: string): WorkKind | null {
  const t = text.toLowerCase();
  if (/\bmemory verse|memorization|verse memor/.test(t)) return 'memory_verse';
  if (/\bbible quiz\b/.test(t)) return 'bible_quiz';
  if (/\bpop\s*quiz\b/.test(t)) return 'pop_quiz';
  if (/\bexit\s*ticket\b/.test(t)) return 'exit_ticket';
  if (/\bwarm[- ]?up\b/.test(t)) return 'warmup';
  if (/\breading\s*log\b/.test(t)) return 'reading_log';
  if (/\b(class )?participation|participate\b/.test(t)) return 'participation';
  if (/\bbehavior|conduct|citizenship\b/.test(t)) return 'behavior';
  if (/\beffort\b/.test(t)) return 'effort';
  if (/\bpresentation|presenting\b/.test(t)) return 'presentation';
  if (/\bmid[- ]?term\b|\bfinal exam\b|\bexam\b/.test(t)) return 'exam';
  if (/\bunit test|chapter test|\btest\b/.test(t)) return 'test';
  if (/\bquiz\b/.test(t)) return 'quiz';
  if (/\bproject\b/.test(t)) return 'project';
  if (/\blab\b/.test(t)) return 'lab';
  if (/\bessay\b/.test(t)) return 'essay';
  if (/\bclasswork|in[- ]?class\b/.test(t)) return 'classwork';
  if (/\bpractice\b/.test(t)) return 'practice';
  if (/\bhomework|worksheet|packet|\bhw\b/.test(t)) return 'homework';
  return null;
}
