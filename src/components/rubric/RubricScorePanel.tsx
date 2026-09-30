/**
 * Teacher scoring panel for review screen (small insertion host).
 */
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { RubricGrid } from '@/components/rubric/RubricGrid';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { type } from '@/constants/theme';
import {
  emptySelections,
  type AssessmentSelection,
  type RubricAssociation,
} from '@/lib/rubric';
import {
  getAssessmentForSubmission,
  getAssociationForAssignment,
  saveRubricAssessment,
} from '@/lib/rubric/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  assignmentId: string;
  submissionId: string;
  studentId: string;
  assignmentMax?: number | null;
  confirmedBy?: string | null;
  /** When score confirmed and use_for_grading, parent can refresh. */
  onConfirmed?: (mappedRaw: number | null) => void;
};

export function RubricScorePanel({
  assignmentId,
  submissionId,
  studentId,
  assignmentMax,
  confirmedBy,
  onConfirmed,
}: Props) {
  const { colors } = useTheme();
  const [assoc, setAssoc] = useState<RubricAssociation | null>(null);
  const [selections, setSelections] = useState<AssessmentSelection[]>([]);
  const [holId, setHolId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const a = await getAssociationForAssignment(assignmentId);
    setAssoc(a);
    if (!a?.snapshot) return;
    const existing = await getAssessmentForSubmission(submissionId, a.id);
    if (existing) {
      setSelections(existing.selections);
      setHolId(existing.holistic_level_id);
    } else {
      setSelections(emptySelections(a.snapshot));
    }
  }, [assignmentId, submissionId]);

  useEffect(() => {
    void load().catch((err) =>
      setStatus(err instanceof Error ? err.message : 'Rubric load failed'),
    );
  }, [load]);

  if (!assoc?.snapshot) return null;

  const save = async (confirm: boolean) => {
    setBusy(true);
    setStatus(null);
    try {
      const row = await saveRubricAssessment({
        association: assoc,
        submissionId,
        studentId,
        selections,
        holisticLevelId: holId,
        assignmentMax,
        confirm,
        confirmedBy,
        writeScore: confirm,
      });
      setStatus(confirm ? 'Confirmed.' : 'Draft saved.');
      if (confirm) onConfirmed?.(row.mapped_raw_points);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <RubricGrid
        rubric={assoc.snapshot}
        selections={selections}
        holisticLevelId={holId}
        editable
        onChangeSelections={setSelections}
        onChangeHolisticLevelId={setHolId}
      />
      <SecondaryButton
        label={busy ? 'Saving…' : 'Save rubric draft'}
        disabled={busy}
        onPress={() => void save(false)}
      />
      <PrimaryButton
        label={busy ? 'Confirming…' : 'Confirm rubric marks'}
        disabled={busy}
        onPress={() => void save(true)}
      />
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
    </View>
  );
}
