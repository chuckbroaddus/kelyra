/**
 * GB-15 FR-ASG-03: expand a group raw into per-student gradebook cell patches.
 * Engine math stays per-student; this only decides stored raw + provenance.
 */
import {
  expandGroupScores,
  type GroupScoreInput,
  type ResolvedStudentScore,
} from '../../lib/grade/engine/groupScore.ts';

export type GroupScoreApplyPatch = {
  student_id: string;
  raw: number | null;
  score_source: 'group' | 'group_override' | 'individual' | 'none';
  group_id: string | null;
  note: string;
  override_wins: boolean;
};

/** Resolve group entry + optional per-student overrides into write patches. */
export function buildGroupScorePatches(
  group: GroupScoreInput,
  overrides: Record<string, number | null | undefined> = {},
): GroupScoreApplyPatch[] {
  return expandGroupScores(group, overrides).map((r: ResolvedStudentScore) => ({
    student_id: r.student_id,
    raw: r.raw,
    score_source: r.source,
    group_id: r.group_id,
    note: r.note,
    override_wins: r.override_wins,
  }));
}

export { expandGroupScores, resolveGroupStudentScore } from '../../lib/grade/engine/groupScore.ts';
