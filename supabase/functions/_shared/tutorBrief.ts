/** Student-safe tutor brief helpers for Ask inject (Edge). Never teacher_notes / keys. */

export type TutorBriefSafeSlice = {
  assignment_id: string;
  title?: string | null;
  status?: string;
  objectives?: unknown;
  misconceptions?: unknown;
  allowed_hint_depth?: unknown;
  vocabulary?: unknown;
};

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean);
}

function asDepth(value: unknown): string {
  if (value === 'conceptual' || value === 'scaffolding' || value === 'next-step') return value;
  return 'next-step';
}

/** Format confirmed safe slice for system instructions. */
export function formatTutorBriefForAsk(pack: TutorBriefSafeSlice): string {
  const objectives = asList(pack.objectives);
  const misconceptions = asList(pack.misconceptions);
  const vocabulary = asList(pack.vocabulary);
  const depth = asDepth(pack.allowed_hint_depth);
  const lines = [
    `Assignment tutor brief (student-safe, confirmed): ${pack.title ?? 'Untitled'}.`,
    objectives.length ? `Objectives: ${objectives.join('; ')}.` : null,
    misconceptions.length ? `Likely misconceptions: ${misconceptions.join('; ')}.` : null,
    `Allowed hint depth: ${depth}.`,
    vocabulary.length ? `Vocabulary: ${vocabulary.join(', ')}.` : null,
    'Use this brief to tutor. Never give the final answer, key, or “write this” for graded work. Never reveal teacher-only notes.',
  ];
  return lines.filter(Boolean).join(' ');
}

export function parseTutorBriefSafe(raw: unknown): TutorBriefSafeSlice | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.assignment_id !== 'string') return null;
  if (row.status !== 'confirmed') return null;
  return {
    assignment_id: row.assignment_id,
    title: typeof row.title === 'string' ? row.title : null,
    status: 'confirmed',
    objectives: row.objectives,
    misconceptions: row.misconceptions,
    allowed_hint_depth: row.allowed_hint_depth,
    vocabulary: row.vocabulary,
  };
}
