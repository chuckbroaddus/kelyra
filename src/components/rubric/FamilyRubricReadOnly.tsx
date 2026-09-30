/**
 * Family/student read-only confirmed rubric marks (FR-RUB-07).
 * Renders nothing when no association or no confirmed assessment yet
 * (still shows blank published grid when association exists).
 */
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { RubricGrid } from '@/components/rubric/RubricGrid';
import { type } from '@/constants/theme';
import type { Rubric, RubricAssessment, RubricAssociation } from '@/lib/rubric';
import {
  getAssessmentForSubmission,
  getAssociationForAssignment,
} from '@/lib/rubric/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  assignmentId: string;
  submissionId: string | null;
  categoryLabel?: string | null;
  scoreText?: string | null;
};

export function FamilyRubricReadOnly({
  assignmentId,
  submissionId,
  categoryLabel,
  scoreText,
}: Props) {
  const { colors } = useTheme();
  const [assoc, setAssoc] = useState<RubricAssociation | null>(null);
  const [assessment, setAssessment] = useState<RubricAssessment | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const a = await getAssociationForAssignment(assignmentId);
        if (cancelled) return;
        setAssoc(a);
        if (!a || !submissionId) return;
        const mark = await getAssessmentForSubmission(submissionId, a.id);
        if (cancelled) return;
        // Family only sees confirmed (RLS also enforces).
        if (mark && mark.status === 'confirmed') setAssessment(mark);
      } catch {
        // Silent — no rubric tab when load fails (FR-RUB-00).
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, submissionId]);

  const rubric: Rubric | null = assoc?.snapshot ?? null;
  if (!rubric) return null;

  const summary =
    scoreText && categoryLabel
      ? `This score is ${scoreText} and counts in ${categoryLabel}.`
      : scoreText
        ? `This score is ${scoreText}.`
        : null;

  return (
    <>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
        Rubric
      </Text>
      <RubricGrid
        rubric={rubric}
        assessment={assessment}
        editable={false}
        hidePoints={Boolean(rubric.scoring.hide_score_from_family)}
        summaryLine={assessment ? summary : 'Expectations only — marks appear after the teacher posts.'}
      />
    </>
  );
}
