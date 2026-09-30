/**
 * Small attach slot for assignment edit (FR-RUB-00 optional).
 */
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { GhostButton, SecondaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { type } from '@/constants/theme';
import {
  attachRubricToAssignment,
  detachRubricFromAssignment,
  getAssociationForAssignment,
  listMyRubrics,
  publishRubric,
} from '@/lib/rubric/api';
import type { Rubric, RubricAssociation } from '@/lib/rubric';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  assignmentId: string | null;
  /** Navigate to builder; parent supplies router. */
  onOpenBuilder?: (rubricId?: string) => void;
};

export function RubricAttachSlot({ assignmentId, onOpenBuilder }: Props) {
  const { colors } = useTheme();
  const [assoc, setAssoc] = useState<RubricAssociation | null>(null);
  const [library, setLibrary] = useState<Rubric[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);

  const reload = useCallback(async () => {
    if (!assignmentId || assignmentId === 'new') {
      setAssoc(null);
      return;
    }
    try {
      const a = await getAssociationForAssignment(assignmentId);
      setAssoc(a);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not load rubric');
    }
  }, [assignmentId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadLibrary = async () => {
    setPicking(true);
    try {
      const rows = await listMyRubrics();
      setLibrary(rows.filter((r) => r.status === 'published' || r.status === 'draft'));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not list rubrics');
    }
  };

  const attach = async (rubric: Rubric) => {
    if (!assignmentId || assignmentId === 'new') {
      setStatus('Save the assignment first, then attach a rubric.');
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      let r = rubric;
      if (r.status !== 'published') r = await publishRubric(r.id);
      const next = await attachRubricToAssignment({ assignmentId, rubric: r });
      setAssoc(next);
      setPicking(false);
      setStatus('Rubric attached.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Attach failed');
    } finally {
      setBusy(false);
    }
  };

  const detach = async () => {
    if (!assignmentId) return;
    setBusy(true);
    try {
      await detachRubricFromAssignment(assignmentId);
      setAssoc(null);
      setStatus('Rubric detached. Posted scores kept.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Detach failed');
    } finally {
      setBusy(false);
    }
  };

  if (!assignmentId) return null;

  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      <Text style={[type.section, { color: colors.mute, textTransform: 'uppercase' }]}>
        Rubric
      </Text>
      {assoc?.snapshot ? (
        <Text style={[type.body, { color: colors.ink }]}>
          {assoc.snapshot.title} · v{assoc.rubric_version}
          {assoc.use_for_grading ? ' · used for grading' : ' · feedback only'}
        </Text>
      ) : (
        <Text style={[type.meta, { color: colors.mute }]}>
          Optional. Most daily work has none.
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {assoc ? (
          <GhostButton align="left" label="Detach" disabled={busy} onPress={() => void detach()} />
        ) : (
          <SecondaryButton
            label={picking ? 'Hide library' : 'Attach rubric'}
            disabled={busy || assignmentId === 'new'}
            onPress={() => {
              if (picking) setPicking(false);
              else void loadLibrary();
            }}
          />
        )}
        <GhostButton
          align="left"
          label="New rubric"
          onPress={() => onOpenBuilder?.()}
        />
      </View>
      {picking
        ? library.map((r) => (
            <Chip
              key={r.id}
              label={`${r.title || 'Untitled'} (${r.kind})`}
              onPress={() => void attach(r)}
            />
          ))
        : null}
      {status ? <Text style={[type.meta, { color: colors.mute }]}>{status}</Text> : null}
    </View>
  );
}
