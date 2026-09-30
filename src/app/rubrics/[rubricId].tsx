/**
 * Rubric builder — analytic / holistic templates + edit + publish.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import {
  buildTemplate,
  canPublish,
  createEmptyRubric,
  hardErrors,
  newId,
  scoreRubric,
  validateRubric,
  type Rubric,
  type RubricCriterion,
  type TemplateKey,
} from '@/lib/rubric';
import { getRubric, publishRubric, rubricErrorMessage, saveRubric } from '@/lib/rubric/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function RubricBuilderScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { teacher } = useAuth();
  const { rubricId } = useLocalSearchParams<{ rubricId?: string }>();
  usePushedTitle('Rubric');
  const ownerId = teacher?.id ?? 'local';
  const [draft, setDraft] = useState<Rubric>(() => createEmptyRubric(ownerId, 'analytic'));
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!rubricId || rubricId === 'new') return;
    try {
      const row = await getRubric(rubricId);
      if (row) setDraft(row);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Load failed');
    }
  }, [rubricId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyTemplate = (key: TemplateKey) => {
    setDraft(buildTemplate(key, ownerId));
    setStatus(null);
  };

  const addCriterion = () => {
    const c: RubricCriterion = {
      id: newId('crit'),
      name: 'Criterion',
      description: '',
      max_points: 5,
      weight_pct: draft.scoring.method === 'weighted_criteria' ? 0 : null,
      extra_credit: false,
      na_allowed: true,
    };
    setDraft({ ...draft, criteria: [...draft.criteria, c] });
  };

  const save = async (andPublish: boolean) => {
    setBusy(true);
    setStatus(null);
    try {
      const issues = validateRubric(draft);
      if (andPublish && hardErrors(issues).length) {
        setStatus(hardErrors(issues)[0]!.message);
        return;
      }
      let row = { ...draft, owner_id: ownerId };
      row = await saveRubric(row);
      if (andPublish) {
        if (!canPublish(row)) {
          setStatus('Fix errors before publish.');
          return;
        }
        row = await publishRubric(row.id);
        setStatus('Published.');
      } else setStatus('Saved draft.');
      setDraft(row);
    } catch (err) {
      setStatus(rubricErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const preview = scoreRubric(
    draft,
    draft.criteria.map((c) => ({
      criterion_id: c.id,
      level_id: null,
      points_awarded: c.max_points,
      comment: '',
      na: false,
    })),
  );

  return (
    <Screen keyboard>
      <Text style={[type.meta, { color: colors.mute }]}>
        Analytic or holistic. Publish is human — AI never posts.
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Essay 20pt" onPress={() => applyTemplate('analytic_essay_20')} />
        <Chip label="Weighted 50/30/20" onPress={() => applyTemplate('analytic_weighted')} />
        <Chip label="Holistic 4" onPress={() => applyTemplate('holistic_4')} />
      </View>
      <TextField
        label="Title"
        value={draft.title}
        onChangeText={(t) => setDraft({ ...draft, title: t })}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip
          label="Analytic"
          selected={draft.kind === 'analytic'}
          onPress={() =>
            setDraft({
              ...draft,
              kind: 'analytic',
              scoring: { ...draft.scoring, method: 'sum_points' },
            })
          }
        />
        <Chip
          label="Holistic"
          selected={draft.kind === 'holistic'}
          onPress={() =>
            setDraft({
              ...draft,
              kind: 'holistic',
              scoring: { ...draft.scoring, method: 'holistic_points' },
            })
          }
        />
        <Chip
          label="Use for grading"
          selected={draft.scoring.use_for_grading}
          onPress={() =>
            setDraft({
              ...draft,
              scoring: {
                ...draft.scoring,
                use_for_grading: !draft.scoring.use_for_grading,
              },
            })
          }
        />
      </View>
      {draft.criteria.map((c, i) => (
        <View key={c.id} style={{ gap: 4 }}>
          <TextField
            label={`Criterion ${i + 1}`}
            value={c.name}
            onChangeText={(t) => {
              const criteria = draft.criteria.map((x) =>
                x.id === c.id ? { ...x, name: t } : x,
              );
              setDraft({ ...draft, criteria });
            }}
          />
          <TextField
            label="Max points"
            value={String(c.max_points)}
            onChangeText={(t) => {
              const n = Number(t);
              const criteria = draft.criteria.map((x) =>
                x.id === c.id ? { ...x, max_points: Number.isFinite(n) ? n : 0 } : x,
              );
              setDraft({ ...draft, criteria });
            }}
          />
        </View>
      ))}
      {draft.kind !== 'holistic' ? (
        <GhostButton align="left" label="Add criterion" onPress={addCriterion} />
      ) : null}
      <Text style={[type.meta, { color: colors.mute }]}>
        Preview (all max): {preview.earned}/{preview.max}
      </Text>
      <PrimaryButton
        label={busy ? 'Saving…' : 'Save draft'}
        disabled={busy}
        onPress={() => void save(false)}
      />
      <SecondaryButton label="Publish" disabled={busy} onPress={() => void save(true)} />
      <GhostButton align="left" label="Back" onPress={() => router.back()} />
      {status ? <Text style={[type.body, { color: colors.mute }]}>{status}</Text> : null}
    </Screen>
  );
}
