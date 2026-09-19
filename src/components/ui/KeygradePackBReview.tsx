/**
 * Pack B — Contextual inline confirm on Capture review (RS-B-K fold).
 * Per-item confirm/override, twins confirm, Unassigned file-then-confirm.
 * Pack B banner is informational — Accept lives on the Decision card.
 * Accept recommendation → onApprove(draftScore). Teach seat only.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import type { ScoredKeyItem } from '@/lib/assignments/scoreKey';
import { canApproveKeygrade, keygradeApproveDeniedReason } from '@/lib/keygrade/approveGate';
import { draftScoreFromItems } from '@/lib/keygrade/draft';
import type { TwinCandidate } from '@/lib/keygrade/twins';
import { buildPackBDecision } from '@/lib/practice/reviewDecision';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type PackBStudentOption = {
  id: string;
  displayName: string;
};

type Props = {
  chromeRole: string | null | undefined;
  items: ScoredKeyItem[];
  assignmentTitle?: string | null;
  maxScore?: number | null;
  studentId: string | null;
  twinCandidates: TwinCandidate[];
  roster: PackBStudentOption[];
  busy?: boolean;
  onChangeItems: (items: ScoredKeyItem[]) => void;
  onSelectStudent: (studentId: string | null) => void;
  onApprove: (draftScore: number | null) => void;
  onSaveDraft: (draftScore: number | null) => void;
};

export function KeygradePackBReview({
  chromeRole,
  items,
  assignmentTitle,
  maxScore,
  studentId,
  twinCandidates,
  roster,
  busy,
  onChangeItems,
  onSelectStudent,
  onApprove,
  onSaveDraft,
}: Props) {
  const { colors } = useTheme();
  const [editingN, setEditingN] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editingDraft, setEditingDraft] = useState(false);
  const allowApprove = canApproveKeygrade(chromeRole);
  const denyReason = keygradeApproveDeniedReason(chromeRole);
  const draftScore = useMemo(() => draftScoreFromItems(items, maxScore), [items, maxScore]);
  const allConfirmed = items.length > 0 && items.every((item) => item.confirmed);
  const twinsNeedConfirm = twinCandidates.length >= 2 && !studentId;
  const unassigned = !studentId;
  const canPublish = allowApprove && allConfirmed && !unassigned && !twinsNeedConfirm;
  const decision = buildPackBDecision({ draftScore, canPublish });

  const confirmItem = (n: number, extractedOverride?: string | null) => {
    onChangeItems(
      items.map((item) => {
        if (item.n !== n) return item;
        const extracted = extractedOverride !== undefined ? extractedOverride : item.extracted;
        let awarded = item.awarded;
        if (extractedOverride !== undefined && item.type === 'mc') {
          const norm = (v: string | null) =>
            (v ?? '').trim().toLowerCase().replace(/^\(+|\)+$/g, '').replace(/[^a-etf]/g, '').slice(0, 1);
          awarded =
            extracted && norm(extracted) && norm(extracted) === norm(item.expected) ? item.points : extracted ? 0 : null;
        } else if (extractedOverride !== undefined && item.type === 'numeric') {
          const norm = (v: string | null) => (v ?? '').trim().replace(/,/g, '').replace(/\s+/g, '').replace(/%$/, '');
          awarded =
            extracted && norm(extracted) === norm(item.expected) ? item.points : extracted ? 0 : null;
        }
        return { ...item, extracted, awarded, residual: awarded == null, confirmed: true };
      }),
    );
    setEditingN(null);
    setEditValue('');
  };

  const confirmAndNext = (n: number) => {
    confirmItem(n);
    const idx = items.findIndex((item) => item.n === n);
    const next = items.slice(idx + 1).find((item) => !item.confirmed);
    if (next) {
      setEditingN(next.n);
      setEditValue(next.extracted ?? '');
    }
  };

  return (
    <Card>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
        Keyed review · Pack B
      </Text>
      {assignmentTitle ? (
        <Text style={[type.meta, { color: colors.mute }]}>
          {assignmentTitle}
          {draftScore != null ? ` · draft ${draftScore}${maxScore != null ? ` / ${maxScore}` : ''}` : ' · draft pending'}
        </Text>
      ) : null}

      {twinsNeedConfirm ? (
        <View style={styles.block}>
          <Text style={[type.body, { color: colors.ink }]}>
            Twins / same first name — confirm who this is. We will not auto-pick or invent a student.
          </Text>
          <ChipRow>
            {twinCandidates.map((twin) => (
              <Chip
                key={twin.studentId}
                label={twin.displayName}
                selected={studentId === twin.studentId}
                onPress={() => onSelectStudent(twin.studentId)}
              />
            ))}
          </ChipRow>
        </View>
      ) : null}

      {unassigned && !twinsNeedConfirm ? (
        <View style={styles.block}>
          <Text style={[type.body, { color: colors.ink }]}>
            Unassigned — file a student before Approve. Matcher never creates a roster row.
          </Text>
          <ChipRow>
            {roster.slice(0, 12).map((row) => (
              <Chip
                key={row.id}
                label={row.displayName}
                selected={studentId === row.id}
                onPress={() => onSelectStudent(row.id)}
              />
            ))}
            <Chip label="Keep Unassigned" selected={!studentId} onPress={() => onSelectStudent(null)} />
          </ChipRow>
        </View>
      ) : null}

      {items.map((item) => {
        const open = editingN === item.n;
        return (
          <View key={`packb-${item.n}`} style={[styles.item, { borderColor: colors.line }]}>
            <Pressable
              onPress={() => {
                setEditingN(item.n);
                setEditValue(item.extracted ?? '');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Item ${item.n} confirm`}
            >
              <Text style={[type.body, { color: colors.ink }]}>
                {item.n}. expected {item.expected || '—'}
                {item.extracted ? ` · saw ${item.extracted}` : ' · blank'}
                {item.awarded != null ? ` · ${item.awarded}/${item.points}` : ' · needs you'}
                {item.confirmed ? ' · confirmed' : ''}
              </Text>
              {item.flag ? <Text style={[type.meta, { color: colors.mute }]}>flag: {item.flag}</Text> : null}
            </Pressable>
            {open ? (
              <View style={styles.sheet}>
                <TextField
                  label="Override extract"
                  value={editValue}
                  onChangeText={setEditValue}
                  autoCapitalize="none"
                />
                <View style={styles.row}>
                  <SecondaryButton
                    label="Confirm & next"
                    disabled={busy}
                    onPress={() => confirmAndNext(item.n)}
                  />
                  <GhostButton
                    label="Confirm"
                    disabled={busy}
                    onPress={() => confirmItem(item.n, editValue.trim() || null)}
                  />
                </View>
              </View>
            ) : !item.confirmed ? (
              <GhostButton label="Confirm extract" disabled={busy} onPress={() => confirmItem(item.n)} />
            ) : null}
          </View>
        );
      })}

      {!allowApprove && denyReason ? (
        <Text style={[type.meta, { color: colors.danger }]}>{denyReason}</Text>
      ) : null}

      <View style={[styles.decision, { borderColor: colors.line }]} accessibilityLabel="Decision card">
        <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
          Decision card
        </Text>
        <Text style={[type.rowTitle, { color: colors.ink }]}>Recommendation</Text>
        {decision.draftOnlyLabel ? (
          <Text style={[type.meta, { color: colors.mute }]}>Draft only</Text>
        ) : null}
        <Text style={[type.meta, { color: colors.mute }]}>Recommended draft</Text>
        <Text style={[type.body, { color: colors.ink }]}>
          {decision.recommendedDraftText}
          {maxScore != null && draftScore != null ? ` / ${maxScore}` : ''}
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? 'Approving…' : 'Accept recommendation'}
            disabled={busy || !decision.canAccept}
            onPress={() => onApprove(draftScore)}
          />
          <SecondaryButton
            label={editingDraft ? 'Hide draft tools' : 'Edit draft'}
            disabled={busy}
            onPress={() => setEditingDraft((v) => !v)}
          />
        </View>
        {editingDraft ? (
          <SecondaryButton
            label={busy ? 'Saving…' : 'Save draft (no publish)'}
            disabled={busy}
            onPress={() => onSaveDraft(draftScore)}
          />
        ) : null}
        {!canPublish && allowApprove ? (
          <Text style={[type.meta, { color: colors.mute }]}>
            {unassigned
              ? 'File the student, then confirm each item to Accept recommendation.'
              : twinsNeedConfirm
                ? 'Confirm which twin, then Accept recommendation.'
                : 'Confirm each item before Accept recommendation. Nothing is a grade until Accept.'}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, marginTop: 8 },
  item: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sheet: { gap: 8, marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  decision: {
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actions: { gap: 8, marginTop: 4 },
});
