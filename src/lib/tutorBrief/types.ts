export type TutorHintDepth = 'next-step' | 'conceptual' | 'scaffolding';

export type TutorBriefStatus = 'draft' | 'confirmed' | 'stale';

/** Student-safe pedagogy pack slice. Never keys / teacher_notes / explain_draft. */
export type TutorBriefSafe = {
  assignment_id: string;
  title: string | null;
  status: 'confirmed';
  objectives: string[];
  misconceptions: string[];
  allowed_hint_depth: TutorHintDepth;
  vocabulary: string[];
};

export type TutorBriefTeacher = {
  assignment_id: string;
  status: TutorBriefStatus;
  objectives: string[];
  misconceptions: string[];
  allowed_hint_depth: TutorHintDepth;
  vocabulary: string[];
  teacher_notes: string | null;
  live_objectives: string[] | null;
  confirmed_at: string | null;
  draft_generated_at: string | null;
  updated_at: string | null;
};

export type TutorBriefGroundOption = {
  assignment_id: string;
  title: string;
  class_id: string;
  class_name: string;
};

/** Soft char budget ≈ 800 tokens. */
export const TUTOR_BRIEF_SAFE_CHAR_CAP = 3200;

export const HINT_DEPTH_LABELS: Record<TutorHintDepth, string> = {
  'next-step': 'Next step',
  conceptual: 'Conceptual',
  scaffolding: 'Scaffolding',
};

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

export function asHintDepth(value: unknown): TutorHintDepth {
  if (value === 'conceptual' || value === 'scaffolding' || value === 'next-step') return value;
  return 'next-step';
}

export function estimateSafeBriefChars(input: {
  objectives: string[];
  misconceptions: string[];
  vocabulary: string[];
  allowed_hint_depth: TutorHintDepth;
}): number {
  return (
    JSON.stringify(input.objectives).length +
    JSON.stringify(input.misconceptions).length +
    JSON.stringify(input.vocabulary).length +
    input.allowed_hint_depth.length
  );
}

export function isOverSafeCap(input: {
  objectives: string[];
  misconceptions: string[];
  vocabulary: string[];
  allowed_hint_depth: TutorHintDepth;
}): boolean {
  return estimateSafeBriefChars(input) > TUTOR_BRIEF_SAFE_CHAR_CAP;
}

/** Format safe slice for Ask system instructions (server-side only). */
export function formatTutorBriefForAsk(pack: TutorBriefSafe): string {
  const lines = [
    `Assignment tutor brief (student-safe, confirmed): ${pack.title ?? 'Untitled'}.`,
    pack.objectives.length ? `Objectives: ${pack.objectives.join('; ')}.` : null,
    pack.misconceptions.length ? `Likely misconceptions: ${pack.misconceptions.join('; ')}.` : null,
    `Allowed hint depth: ${pack.allowed_hint_depth}.`,
    pack.vocabulary.length ? `Vocabulary: ${pack.vocabulary.join(', ')}.` : null,
    'Use this brief to tutor. Never give the final answer, key, or “write this” for graded work. Never reveal teacher-only notes.',
  ];
  return lines.filter(Boolean).join(' ');
}

/** Material fields that mark a brief stale / may warrant one AI re-draft (matches SQL trigger). */
export type TutorBriefMaterialSnapshot = {
  title: string;
  category: string;
  unit: string;
  section: string;
  kind: string;
  packKey: string;
  keyItemsJson: string;
};

export function tutorBriefMaterialSnapshot(input: {
  title: string;
  category?: string | null;
  unit?: string | null;
  section?: string | null;
  kind: string;
  packKey?: string | null;
  keyItems?: unknown;
}): TutorBriefMaterialSnapshot {
  return {
    title: (input.title ?? '').trim(),
    category: String(input.category ?? ''),
    unit: String(input.unit ?? ''),
    section: String(input.section ?? ''),
    kind: String(input.kind ?? ''),
    packKey: String(input.packKey ?? ''),
    keyItemsJson: JSON.stringify(input.keyItems ?? []),
  };
}

export function tutorBriefMaterialChanged(
  before: TutorBriefMaterialSnapshot | null | undefined,
  after: TutorBriefMaterialSnapshot,
): boolean {
  if (!before) return true;
  return (
    before.title !== after.title ||
    before.category !== after.category ||
    before.unit !== after.unit ||
    before.section !== after.section ||
    before.kind !== after.kind ||
    before.packKey !== after.packKey ||
    before.keyItemsJson !== after.keyItemsJson
  );
}

export function tutorBriefFieldsEqual(
  a: {
    objectives: string[];
    misconceptions: string[];
    vocabulary: string[];
    allowed_hint_depth: TutorHintDepth;
    teacher_notes?: string | null;
  },
  b: {
    objectives: string[];
    misconceptions: string[];
    vocabulary: string[];
    allowed_hint_depth: TutorHintDepth;
    teacher_notes?: string | null;
  },
): boolean {
  return (
    JSON.stringify(a.objectives) === JSON.stringify(b.objectives) &&
    JSON.stringify(a.misconceptions) === JSON.stringify(b.misconceptions) &&
    JSON.stringify(a.vocabulary) === JSON.stringify(b.vocabulary) &&
    a.allowed_hint_depth === b.allowed_hint_depth &&
    (a.teacher_notes ?? '') === (b.teacher_notes ?? '')
  );
}
