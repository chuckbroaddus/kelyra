/**
 * GB-14 teacher AI rubric proposal card (review inbox).
 * Per-cell AI level + evidence; tap to change; confirm → RubricAssessment.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { type } from '@/constants/theme';
import {
  AI_HIGH_CONFIDENCE_THRESHOLD,
  isProposalOpen,
  scoreRubric,
  type AiGradeProposal,
  type AiGradeProposalCell,
  type Rubric,
  type RubricAssociation,
} from '@/lib/rubric';
import {
  confirmAiGradeProposal,
  discardAiGradeProposal,
  getAiGradeProposal,
} from '@/lib/rubric/aiProposalApi';
import { getAssociationForAssignment } from '@/lib/rubric/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  assignmentId: string;
  submissionId: string;
  studentId: string;
  assignmentMax?: number | null;
  confirmedBy?: string | null;
  onConfirmed?: (mappedRaw: number | null) => void;
  onDiscarded?: () => void;
};

function confLabel(c: number): string {
  if (c >= AI_HIGH_CONFIDENCE_THRESHOLD) return 'high';
  if (c >= 0.55) return 'mid';
  return 'low';
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export function AiProposalCard({
  assignmentId,
  submissionId,
  studentId,
  assignmentMax,
  confirmedBy,
  onConfirmed,
  onDiscarded,
}: Props) {
  const { colors } = useTheme();
  const [assoc, setAssoc] = useState<RubricAssociation | null>(null);
  const [proposal, setProposal] = useState<AiGradeProposal | null>(null);
  const [cells, setCells] = useState<AiGradeProposalCell[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const a = await getAssociationForAssignment(assignmentId);
    setAssoc(a);
    if (!a?.snapshot) {
      setProposal(null);
      setCells([]);
      return;
    }
    const p = await getAiGradeProposal(submissionId, a.id);
    setProposal(p);
    setCells(p?.cells ?? []);
  }, [assignmentId, submissionId]);

  useEffect(() => {
    void load().catch((err) =>
      setStatus(err instanceof Error ? err.message : 'Proposal load failed'),
    );
  }, [load]);

  const open = proposal && isProposalOpen(proposal.status);

  const liveTotal = useMemo(() => {
    const rubric = assoc?.snapshot;
    if (!rubric || !cells.length) return null;
    const hol =
      rubric.kind === 'holistic' || rubric.scoring.method === 'holistic_points'
        ? cells[0]?.level_id ?? null
        : null;
    return scoreRubric(
      rubric,
      cells.map((c) => ({
        criterion_id: c.criterion_id,
        level_id: c.level_id,
        points_awarded: c.points,
        comment: c.comment || '',
        na: Boolean(c.na),
      })),
      { holistic_level_id: hol },
    );
  }, [assoc, cells]);

  if (!assoc?.snapshot || !proposal || !open) return null;

  if (proposal.status === 'needs_manual') {
    return (
      <View style={styles.wrap}>
        <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
          AI rubric proposal
        </Text>
        <Text style={[type.body, { color: colors.ink }]}>
          Needs manual scoring — AI could not draft cells.
        </Text>
        <SecondaryButton
          label="Dismiss AI proposal"
          disabled={busy}
          onPress={() => {
            if (!proposal.id) return;
            setBusy(true);
            void discardAiGradeProposal(proposal.id)
              .then(() => {
                setProposal(null);
                onDiscarded?.();
              })
              .catch((err: unknown) => setStatus(err instanceof Error ? err.message : 'Discard failed'))
              .finally(() => setBusy(false));
          }}
        />
      </View>
    );
  }

  const setLevel = (criterionId: string, levelId: string) => {
    const rubric = assoc.snapshot;
    if (!rubric) return;
    const cellDef = rubric.cells.find(
      (c) => c.criterion_id === criterionId && c.level_id === levelId,
    );
    setCells((prev) =>
      prev.map((c) =>
        c.criterion_id === criterionId
          ? { ...c, level_id: levelId, points: cellDef?.points ?? null, na: false }
          : c,
      ),
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
        AI rubric proposal
      </Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Draft only — families never see AI picks or confidence.
      </Text>
      {liveTotal ? (
        <Text style={[type.rowTitle, { color: colors.ink }]}>
          Proposed {formatNum(liveTotal.earned)}/{formatNum(liveTotal.max)}
        </Text>
      ) : null}
      {cells.map((cell) => {
        const crit = assoc.snapshot!.criteria.find((c) => c.id === cell.criterion_id);
        return (
          <View key={cell.criterion_id} style={styles.cell}>
            <Text style={[type.rowTitle, { color: colors.ink }]}>
              {crit?.name ?? cell.criterion_id}
            </Text>
            <Text style={[type.meta, { color: colors.mute }]}>
              conf {cell.confidence.toFixed(2)} ({confLabel(cell.confidence)})
              {cell.points != null ? ` · ${formatNum(cell.points)} pts` : ''}
            </Text>
            {cell.evidence ? (
              <Text style={[type.body, { color: colors.ink }]}>"{cell.evidence}"</Text>
            ) : null}
            <View style={styles.chips}>
              {assoc.snapshot!.levels.map((lvl) => (
                <Chip
                  key={lvl.id}
                  label={lvl.label}
                  selected={cell.level_id === lvl.id}
                  onPress={() => setLevel(cell.criterion_id, lvl.id)}
                />
              ))}
            </View>
          </View>
        );
      })}
      <PrimaryButton
        label={busy ? 'Confirming…' : 'Confirm and post rubric'}
        disabled={busy}
        onPress={() => {
          setBusy(true);
          setStatus(null);
          void confirmAiGradeProposal({
            proposal,
            association: assoc,
            cells,
            studentId,
            submissionId,
            assignmentMax,
            confirmedBy,
            writeScore: true,
          })
            .then((row: { mapped_raw_points: number | null }) => {
              setStatus('Confirmed.');
              setProposal({ ...proposal, status: 'accepted', cells });
              onConfirmed?.(row.mapped_raw_points);
            })
            .catch((err: unknown) => setStatus(err instanceof Error ? err.message : 'Confirm failed'))
            .finally(() => setBusy(false));
        }}
      />
      <SecondaryButton
        label={busy ? '…' : 'Discard AI and score myself'}
        disabled={busy || !proposal.id}
        onPress={() => {
          if (!proposal.id) return;
          setBusy(true);
          void discardAiGradeProposal(proposal.id)
            .then(() => {
              setProposal(null);
              onDiscarded?.();
            })
            .catch((err: unknown) => setStatus(err instanceof Error ? err.message : 'Discard failed'))
            .finally(() => setBusy(false));
        }}
      />
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  cell: { gap: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
