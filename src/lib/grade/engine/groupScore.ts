/**
 * GB-15 group-score override (FR-ASG-03).
 * Engine math stays per-student: this only resolves which raw is stored/shown.
 * Per-student override always wins over the shared group score.
 */

export type ScoreSourceKind = 'individual' | 'group' | 'group_override' | 'none';

export type GroupScoreInput = {
  group_id: string;
  assignment_id: string;
  raw: number;
  student_ids: string[];
};

export type ResolvedStudentScore = {
  assignment_id: string;
  student_id: string;
  raw: number | null;
  source: ScoreSourceKind;
  group_id: string | null;
  /** True when an individual value replaced the group value. */
  override_wins: boolean;
  note: string;
};

/**
 * Resolve one student's counted raw for an assignment.
 * individualOverride (including explicit null with has_override) beats group.
 */
export function resolveGroupStudentScore(input: {
  assignment_id: string;
  student_id: string;
  /** Shared group score if this student is in a group for the assignment. */
  group: GroupScoreInput | null | undefined;
  /** Per-student override raw; undefined = no override entered. */
  individual_raw?: number | null;
  /** When true, individual_raw is intentional (even if null = clear). */
  has_individual?: boolean;
}): ResolvedStudentScore {
  const inGroup =
    input.group != null &&
    input.group.student_ids.includes(input.student_id) &&
    Number.isFinite(input.group.raw);

  const hasIndividual =
    input.has_individual === true ||
    (input.individual_raw != null && Number.isFinite(input.individual_raw));

  if (hasIndividual && inGroup) {
    return {
      assignment_id: input.assignment_id,
      student_id: input.student_id,
      raw: input.individual_raw ?? null,
      source: 'group_override',
      group_id: input.group!.group_id,
      override_wins: true,
      note: 'Per-student override wins over group score',
    };
  }

  if (hasIndividual) {
    return {
      assignment_id: input.assignment_id,
      student_id: input.student_id,
      raw: input.individual_raw ?? null,
      source: 'individual',
      group_id: null,
      override_wins: false,
      note: 'Individual score',
    };
  }

  if (inGroup) {
    return {
      assignment_id: input.assignment_id,
      student_id: input.student_id,
      raw: input.group!.raw,
      source: 'group',
      group_id: input.group!.group_id,
      override_wins: false,
      note: `Group score (${input.group!.group_id})`,
    };
  }

  return {
    assignment_id: input.assignment_id,
    student_id: input.student_id,
    raw: null,
    source: 'none',
    group_id: null,
    override_wins: false,
    note: 'No score',
  };
}

/** Expand a group entry into per-student resolved rows (overrides map optional). */
export function expandGroupScores(
  group: GroupScoreInput,
  overrides: Record<string, number | null | undefined> = {},
): ResolvedStudentScore[] {
  return group.student_ids.map((student_id) => {
    const has = Object.prototype.hasOwnProperty.call(overrides, student_id);
    return resolveGroupStudentScore({
      assignment_id: group.assignment_id,
      student_id,
      group,
      individual_raw: has ? overrides[student_id] ?? null : undefined,
      has_individual: has,
    });
  });
}
