import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type } from '@/constants/theme';
import {
  attachExplainAsNote,
  discardExplainDraft,
  parseExplainDraft,
  requestExplainCapture,
  saveEditedExplainDraft,
  type ExplainDraft,
} from '@/lib/explain/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  captureId: string;
  classId: string;
  imageUrl?: string | null;
  initialDraft?: unknown;
  initialStatus?: string | null;
  onChanged?: () => void;
};

/** Teacher Explain draft — not a second Approve. Default Keep private. */
export function ExplainDraftCard(props: Props) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState<ExplainDraft | null>(() => parseExplainDraft(props.initialDraft));
  const [status, setStatus] = useState(props.initialStatus ?? (draft ? 'draft' : 'none'));
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmAttach, setConfirmAttach] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepsText, setStepsText] = useState(draft?.steps.join('\n') ?? '');
  const [reteach, setReteach] = useState(draft?.reteach ?? '');

  const runExplain = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await requestExplainCapture({
        captureId: props.captureId,
        classId: props.classId,
        imageUrl: props.imageUrl,
      });
      setDraft(next);
      setStatus('draft');
      setStepsText(next.steps.join('\n'));
      setReteach(next.reteach ?? '');
      props.onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Explain failed');
    } finally {
      setBusy(false);
    }
  };

  const onKeepPrivate = () => {
    setConfirmAttach(false);
    setEditing(false);
  };

  const onSaveEdit = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const next: ExplainDraft = {
        ...draft,
        steps: stepsText.split('\n').map((s) => s.trim()).filter(Boolean),
        reteach: reteach.trim() || null,
      };
      await saveEditedExplainDraft(props.captureId, next);
      setDraft(next);
      setStatus('draft');
      setEditing(false);
      props.onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft');
    } finally {
      setBusy(false);
    }
  };

  const onDiscard = async () => {
    setBusy(true);
    setError(null);
    try {
      await discardExplainDraft(props.captureId);
      setDraft(null);
      setStatus('none');
      setConfirmAttach(false);
      setEditing(false);
      props.onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discard');
    } finally {
      setBusy(false);
    }
  };

  const onAttach = async () => {
    setBusy(true);
    setError(null);
    try {
      await attachExplainAsNote(props.captureId);
      setStatus('noted');
      setConfirmAttach(false);
      props.onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not attach note');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.line }]}>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>Explain</Text>
      <Text style={[type.meta, { color: colors.mute }]}>Draft only — not a grade. Keep private by default.</Text>
      {busy ? <WorkingLine text="Working…" /> : null}
      {error ? <Text style={[type.meta, { color: colors.mute }]}>{error}</Text> : null}
      {!draft ? (
        <SecondaryButton disabled={busy} label="Explain" onPress={() => void runExplain()} />
      ) : (
        <>
          {editing ? (
            <>
              <TextField label="Steps (one per line)" value={stepsText} onChangeText={setStepsText} multiline />
              <TextField label="Re-teach" value={reteach} onChangeText={setReteach} />
              <PrimaryButton disabled={busy} label="Save draft" onPress={() => void onSaveEdit()} />
            </>
          ) : (
            <>
              {draft.steps.length > 0 ? (
                <MathText style={type.body} color={colors.ink}>
                  {draft.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
                </MathText>
              ) : null}
              {draft.reteach ? (
                <>
                  <Text style={[type.meta, { color: colors.mute }]}>Re-teach</Text>
                  <MathText style={type.meta} color={colors.mute}>
                    {draft.reteach}
                  </MathText>
                </>
              ) : null}
            </>
          )}
          <View style={styles.row}>
            <GhostButton align="left" label="Keep private" onPress={onKeepPrivate} />
            <GhostButton align="left" label="Edit" onPress={() => setEditing(true)} />
            <GhostButton align="left" label="Discard" onPress={() => void onDiscard()} />
          </View>
          {confirmAttach ? (
            <View style={styles.row}>
              <PrimaryButton disabled={busy} label="Confirm attach as teacher note" onPress={() => void onAttach()} />
              <GhostButton align="left" label="Cancel" onPress={() => setConfirmAttach(false)} />
            </View>
          ) : (
            <SecondaryButton
              disabled={busy || status === 'noted'}
              label={status === 'noted' ? 'Attached as note' : 'Attach as teacher note'}
              onPress={() => setConfirmAttach(true)}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  row: { gap: 8 },
});
