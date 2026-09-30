/**
 * GB-07 School Grading and Reporting Policy wizard (office admin).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { IngestProposalReview } from '@/components/ingest/IngestProposalReview';
import { StartFromDocumentButton } from '@/components/ingest/StartFromDocumentButton';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
import { invokeIngestGradingDoc } from '@/lib/ingest/invokeIngest';
import { mergeIntoSetupDraft } from '@/lib/ingest/pathMapping';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { uploadTeacherAsset, signedUrlForAsset } from '@/lib/media/upload';
import { pickNormalizedPhoto, webCameraNeeded } from '@/lib/media/pickPhoto';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { isOfficeRole } from '@/lib/school/roles';
import {
  WIZARD_STEPS,
  STEP_LABELS,
  STEP_HELP_KEYS,
  applyLevelDefaults,
  applyTemplateNotSure,
  canPublish,
  createEmptyDraft,
  defaultGpaProfiles,
  draftToPayload,
  getFieldValue,
  hardErrors,
  publishPolicy,
  rebuildCalendarFromDraft,
  saveDraftPayload,
  setField,
  soFarSummary,
  validatePolicyPayload,
  qualityTablesForMethod,
  type CreditPolicy,
  type GpaMode,
  type QpMethodChoice,
  type SchoolLevelChoice,
  type SetupDraft,
  type SyllabusLocks,
  type WizardStepId,
} from '@/lib/school/gradingPolicy';
import type { GpaProfile } from '@/lib/grade/gpa/gpa';
import type { TemplateKey } from '@/lib/grade/calendar/types';
import { ROLLUP_PRESET_KEYS, presetsForChildCount } from '@/lib/grade/calendar/index';
import { listScaleTemplates, makeScaleFromTemplate } from '@/lib/grade/scale/scale';
import { useTheme } from '@/lib/theme/ThemeProvider';

const LEVELS: SchoolLevelChoice[] = ['elementary', 'middle', 'high', 'college', 'mixed'];
const TEMPLATES: TemplateKey[] = [
  'tx_six_weeks',
  'nine_weeks',
  'trimester',
  'college_term',
  'elementary_year_4',
  'elementary_year_6',
];

export default function GradingPolicyWizardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const office = isOfficeRole(profile);
  const schoolId = profile?.school_id ?? '';
  usePushedTitle('Grading policy');

  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [step, setStep] = useState<WizardStepId>('level');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const [ingestProposal, setIngestProposal] = useState<IngestProposal | null>(null);
  const [ingestCamera, setIngestCamera] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    setDraft(createEmptyDraft(schoolId, 'high'));
  }, [schoolId]);

  const payload = useMemo(() => (draft ? draftToPayload(draft) : null), [draft]);
  const issues = useMemo(() => (payload ? validatePolicyPayload(payload) : []), [payload]);
  const errors = useMemo(() => hardErrors(issues), [issues]);
  const help = getBundledHelpTopic(STEP_HELP_KEYS[step]);
  const stepIndex = WIZARD_STEPS.indexOf(step);

  const go = useCallback((id: WizardStepId) => {
    setStep(id);
    setDraft((d) => (d ? { ...d, current_step: id } : d));
  }, []);

  const next = () => {
    const i = stepIndex + 1;
    if (i < WIZARD_STEPS.length) go(WIZARD_STEPS[i]!);
  };
  const back = () => {
    const i = stepIndex - 1;
    if (i >= 0) go(WIZARD_STEPS[i]!);
  };

  const runSchoolIngest = async (uri: string, mimeType: string) => {
    if (!schoolId || !profile?.id) return;
    setBusy(true);
    setError(null);
    setStatus('Reading policy document…');
    try {
      const asset = await uploadTeacherAsset({
        teacherId: profile.id,
        kind: 'photo',
        uri,
        mimeType,
      });
      const imageUrl = await signedUrlForAsset('photo', asset.storage_path);
      if (!imageUrl) throw new Error('Could not open the uploaded document.');
      const { proposal } = await invokeIngestGradingDoc({
        kind: 'school_policy',
        school_id: schoolId,
        storage_paths: [asset.storage_path],
        image_urls: [imageUrl],
        source_id: asset.id,
      });
      setIngestProposal(proposal);
      setStatus('Proposal ready — review fields before continuing the wizard.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document');
    } finally {
      setBusy(false);
    }
  };

  const onStartFromDocument = async () => {
    if (webCameraNeeded(false)) {
      setIngestCamera(true);
      return;
    }
    try {
      const photo = await pickNormalizedPhoto(false);
      if (!photo) return;
      await runSchoolIngest(photo.uri, photo.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open document');
    }
  };

  const applyIngestFields = (accepted: IngestField[]) => {
    if (!draft || !ingestProposal) return;
    const filtered: IngestProposal = { ...ingestProposal, fields: accepted };
    const { setup } = mergeIntoSetupDraft(draft, filtered);
    setDraft(setup);
    setIngestProposal(null);
    setStatus('Proposal applied. Review highlighted steps before publish.');
  };

  if (!office) {
    return (
      <Screen maxWidth={640}>
        <Text style={[type.body, { color: colors.danger }]}>
          Office administrators only. Switch to an office seat to set grading policy.
        </Text>
      </Screen>
    );
  }

  if (!draft || !payload) {
    return (
      <Screen maxWidth={640}>
        <Text style={[type.body, { color: colors.mute }]}>Loading defaults…</Text>
      </Screen>
    );
  }

  const summary = soFarSummary(draft);

  return (
    <Screen maxWidth={720} keyboard>
      <GhostButton
        label="Answer a few questions instead"
        onPress={() => router.push('/school/grading-policy/interview' as never)}
      />
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>{summary}</Text>
      <StartFromDocumentButton onPress={() => void onStartFromDocument()} disabled={busy} />
      {ingestCamera ? (
        <WebCameraCapture
          onCapture={(uri, mimeType) => {
            setIngestCamera(false);
            void runSchoolIngest(uri, mimeType);
          }}
          onCancel={() => setIngestCamera(false)}
        />
      ) : null}
      {ingestProposal ? (
        <IngestProposalReview
          proposal={ingestProposal}
          sourceLabel="policy document"
          onApply={applyIngestFields}
          onDiscard={() => {
            setIngestProposal(null);
            setStatus('Proposal discarded. Published policy unchanged.');
          }}
        />
      ) : null}
      <ChipRow>
        {WIZARD_STEPS.map((id) => (
          <Chip
            key={id}
            label={STEP_LABELS[id]}
            selected={id === step}
            quiet={id !== step}
            onPress={() => go(id)}
          />
        ))}
      </ChipRow>

      {helpOpen && help ? (
        <Card>
          <View style={styles.helpHead}>
            <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{help.title}</Text>
            <GhostButton label="Hide help" onPress={() => setHelpOpen(false)} />
          </View>
          <Text style={[type.meta, { color: colors.mute }]}>{help.meaning}</Text>
          {help.example ? (
            <Text style={[type.meta, { color: colors.ink, marginTop: 6 }]}>Example: {help.example}</Text>
          ) : null}
        </Card>
      ) : (
        <GhostButton label="Show help" onPress={() => setHelpOpen(true)} />
      )}

      <Card>
        <Text style={[type.title, { color: colors.ink, marginBottom: 12 }]}>{STEP_LABELS[step]}</Text>
        <WizardStepBody
          step={step}
          draft={draft}
          payload={payload}
          colors={colors}
          setDraft={setDraft}
          errors={errors}
        />
      </Card>

      {error ? <Text style={[styles.flash, { color: colors.danger }]}>{error}</Text> : null}
      {status ? <Text style={[styles.flash, { color: colors.mute }]}>{status}</Text> : null}

      <View style={styles.nav}>
        <SecondaryButton label="Back" onPress={back} disabled={stepIndex === 0 || busy} />
        {step !== 'review' ? (
          <PrimaryButton label="Continue" onPress={next} disabled={busy} />
        ) : (
          <PrimaryButton
            label={busy ? 'Publishing…' : 'Publish'}
            disabled={busy || !canPublish(payload) || !schoolId}
            onPress={() => {
              void (async () => {
                setBusy(true);
                setError(null);
                setStatus(null);
                try {
                  await saveDraftPayload(schoolId, payload);
                  const result = await publishPolicy(schoolId, payload);
                  setStatus(
                    `Published v${result.plan.next_version}. Bound ${result.binding?.class_ids.length ?? 0} classes.`,
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Publish failed');
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        )}
      </View>
      <GhostButton label="Close" onPress={() => router.back()} />
    </Screen>
  );
}

type BodyProps = {
  step: WizardStepId;
  draft: SetupDraft;
  payload: ReturnType<typeof draftToPayload>;
  colors: { ink: string; mute: string; brand: string; danger: string; line: string };
  setDraft: (d: SetupDraft) => void;
  errors: ReturnType<typeof hardErrors>;
};

function WizardStepBody({ step, draft, payload, colors, setDraft, errors }: BodyProps) {
  if (step === 'level') {
    return (
      <ChipRow>
        {LEVELS.map((lvl) => (
          <Chip
            key={lvl}
            label={lvl}
            selected={getFieldValue(draft, 'level', 'high') === lvl}
            onPress={() => setDraft(applyLevelDefaults(draft, lvl))}
          />
        ))}
      </ChipRow>
    );
  }
  if (step === 'calendar') {
    return (
      <>
        <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>Calendar template</Text>
        <ChipRow>
          {TEMPLATES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={getFieldValue(draft, 'calendar.template', 'tx_six_weeks') === t}
              onPress={() => {
                let nextDraft = setField(draft, 'calendar.template', t, 'user');
                nextDraft = rebuildCalendarFromDraft(nextDraft);
                setDraft(nextDraft);
              }}
            />
          ))}
        </ChipRow>
        <View style={{ height: 8 }} />
        <GhostButton label="I'm not sure — apply recommended" onPress={() => setDraft(applyTemplateNotSure(draft))} />
        <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
          Periods: {payload.calendar.periods.map((p) => p.code).join(', ')}
        </Text>
      </>
    );
  }
  if (step === 'dates') {
    return (
      <>
        <TextField
          label="Year start (YYYY-MM-DD)"
          value={getFieldValue(draft, 'calendar.year_start', '') ?? ''}
          onChangeText={(v) => {
            let d = setField(draft, 'calendar.year_start', v || null, 'user');
            d = rebuildCalendarFromDraft(d);
            setDraft(d);
          }}
        />
        <TextField
          label="Year end (YYYY-MM-DD)"
          value={getFieldValue(draft, 'calendar.year_end', '') ?? ''}
          onChangeText={(v) => {
            let d = setField(draft, 'calendar.year_end', v || null, 'user');
            d = rebuildCalendarFromDraft(d);
            setDraft(d);
          }}
        />
        {payload.calendar.periods
          .filter((p) => p.kind === 'marking_period' || p.kind === 'credit_term' || p.kind === 'exam')
          .map((p) => (
            <ListRow
              key={p.code}
              title={`${p.code} · ${p.name}`}
              status={`${p.start_date ?? '—'} → ${p.end_date ?? '—'} · ${p.kind}`}
              chevron={false}
            />
          ))}
      </>
    );
  }
  if (step === 'credit') {
    const cur = getFieldValue<CreditPolicy>(draft, 'credit.policy', payload.credit_policy);
    return (
      <>
        <ChipRow>
          {(
            [
              ['semester_0_5', 'Semester 0.5'],
              ['year_1_0', 'Year 1.0'],
              ['none', 'None'],
            ] as const
          ).map(([unit, label]) => (
            <Chip
              key={unit}
              label={label}
              selected={cur.unit === unit}
              onPress={() => setDraft(setField(draft, 'credit.policy', { ...cur, unit }, 'user'))}
            />
          ))}
        </ChipRow>
        <View style={{ height: 8 }} />
        <Chip
          label={cur.year_link ? 'Year-link credit ON' : 'Year-link credit OFF'}
          selected={cur.year_link}
          onPress={() =>
            setDraft(setField(draft, 'credit.policy', { ...cur, year_link: !cur.year_link }, 'user'))
          }
        />
      </>
    );
  }
  if (step === 'rollup') {
    // Only offer presets that fit how many marking periods each credit term has.
    const cal = getFieldValue<{ periods?: { id: string; kind: string; parent_id: string | null }[] } | null>(
      draft,
      'calendar.model',
      null,
    );
    const firstTerm = cal?.periods?.find((p) => p.kind === 'credit_term');
    const childCount = firstTerm
      ? (cal?.periods ?? []).filter((p) => p.kind === 'marking_period' && p.parent_id === firstTerm.id).length
      : (cal?.periods ?? []).filter((p) => p.kind === 'marking_period').length;
    const presetKeys = childCount > 0 ? presetsForChildCount(childCount) : ROLLUP_PRESET_KEYS;
    return (
      <ChipRow>
        {presetKeys.map((key) => (
          <Chip
            key={key}
            label={key}
            selected={getFieldValue(draft, 'rollup.preset', '2/7+1/7') === key}
            onPress={() => {
              let d = setField(draft, 'rollup.preset', key, 'user');
              d = rebuildCalendarFromDraft(d);
              setDraft(d);
            }}
          />
        ))}
      </ChipRow>
    );
  }
  if (step === 'scale') {
    return (
      <>
        <ChipRow>
          {listScaleTemplates().map((t) => (
            <Chip
              key={t.key}
              label={t.name}
              selected={getFieldValue(draft, 'scale.default_id', '') === t.key}
              onPress={() => {
                const scale = makeScaleFromTemplate(t.key);
                let d = setField(draft, 'scale.default_id', scale.id, 'user');
                d = setField(d, 'scale.list', [scale], 'user');
                setDraft(d);
              }}
            />
          ))}
        </ChipRow>
        {payload.scales[0]?.bands.map((b) => (
          <Text key={b.letter} style={[type.meta, { color: colors.ink }]}>
            {b.letter}: {b.min_pct}–{b.max_pct}
            {b.passing ? ' · passing' : ''}
          </Text>
        ))}
      </>
    );
  }
  if (step === 'quality_points') {
    const method = getFieldValue<QpMethodChoice>(draft, 'qp.method', 'letter_map');
    return (
      <>
        <Text style={[type.meta, { color: colors.mute, marginBottom: 6 }]}>Quality-point method</Text>
        <ChipRow>
          {(
            [
              ['letter_map', 'Letter map'],
              ['numeric_band', 'Numeric band (6.0)'],
              ['percent_map', 'Percent map'],
            ] as const
          ).map(([m, label]) => (
            <Chip
              key={m}
              label={label}
              selected={method === m}
              onPress={() => {
                let d = setField(draft, 'qp.method', m, 'user');
                d = setField(d, 'qp.tables', qualityTablesForMethod(m), 'user');
                setDraft(d);
              }}
            />
          ))}
        </ChipRow>
        {payload.quality_point_tables.map((t) => (
          <Card key={t.id}>
            <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>
              {t.id} · {t.method}
            </Text>
            <Text style={[type.meta, { color: colors.mute }]}>
              {t.method === 'numeric_band'
                ? t.rows
                    .slice(0, 3)
                    .map(
                      (r) =>
                        `${r.min_pct}–${r.max_pct}=${r.points_by_level.regular}/${r.points_by_level.honors ?? '—'}/${r.points_by_level.ap ?? '—'}`,
                    )
                    .join(' · ')
                : t.rows
                    .slice(0, 6)
                    .map((r) => `${r.letter ?? '?'}=${r.points_by_level.regular ?? '—'}`)
                    .join(' · ')}
              {t.rows.length > 6 ? ' …' : ''}
            </Text>
          </Card>
        ))}
      </>
    );
  }
  if (step === 'course_levels') {
    return (
      <>
        {payload.course_levels
          .filter((l) => l.key !== 'dual')
          .map((l) => (
            <ListRow
              key={l.key}
              title={l.label}
              status={`bonus ${l.weighted_bonus} · key ${l.key}`}
              chevron={false}
            />
          ))}
      </>
    );
  }
  if (step === 'gpa') {
    const profiles = getFieldValue(draft, 'gpa.profiles', payload.gpa_profiles);
    const repeat = getFieldValue(draft, 'gpa.repeat', profiles[0]?.repeat ?? 'include_both');
    return (
      <>
        <ChipRow>
          {(
            [
              ['off', 'GPA off'],
              ['unweighted', 'Unweighted only'],
              ['unweighted_and_weighted', 'Unweighted + weighted'],
              ['with_rank', 'UW + W + rank 6.0'],
            ] as const
          ).map(([mode, label]) => (
            <Chip
              key={mode}
              label={label}
              selected={getFieldValue<GpaMode>(draft, 'gpa.mode', 'off') === mode}
              onPress={() => {
                let d = setField(draft, 'gpa.mode', mode as GpaMode, 'user');
                d = setField(d, 'gpa.profiles', defaultGpaProfiles(mode as GpaMode), 'user');
                setDraft(d);
              }}
            />
          ))}
        </ChipRow>
        <Text style={[type.meta, { color: colors.mute, marginTop: 10 }]}>Repeat rule</Text>
        <ChipRow>
          {(
            [
              ['include_both', 'Keep both'],
              ['replace', 'Replace'],
              ['average', 'Average'],
              ['forgive_d_f', 'Forgive D/F'],
            ] as const
          ).map(([rule, label]) => (
            <Chip
              key={rule}
              label={label}
              selected={repeat === rule}
              onPress={() => {
                const next = (profiles as GpaProfile[]).map((p) => ({ ...p, repeat: rule }));
                let d = setField(draft, 'gpa.repeat', rule, 'user');
                d = setField(d, 'gpa.profiles', next, 'user');
                setDraft(d);
              }}
            />
          ))}
        </ChipRow>
        <Text style={[type.meta, { color: colors.mute, marginTop: 10 }]}>
          PE/athletics inclusion follows each profile (help.include_pe). Rank uses a narrower set.
        </Text>
      </>
    );
  }
  if (step === 'locks') {
    const locks = getFieldValue<SyllabusLocks>(draft, 'locks.map', payload.locks);
    return (
      <>
        {(Object.keys(locks) as Array<keyof SyllabusLocks>).map((key) => {
          const on = locks[key];
          return (
            <Pressable
              key={key}
              onPress={() => setDraft(setField(draft, 'locks.map', { ...locks, [key]: !on }, 'user'))}
              style={[styles.lockRow, { borderColor: colors.line }]}
            >
              <Text style={[type.body, { color: colors.ink }]}>{key}</Text>
              <Text style={[type.meta, { color: on ? colors.brand : colors.mute }]}>
                {on ? 'Locked' : 'Teacher may edit'}
              </Text>
            </Pressable>
          );
        })}
      </>
    );
  }
  // review
  return (
    <>
      <Text style={[type.body, { color: colors.ink }]} accessibilityLabel="review-summary">
        {soFarSummary(draft)}
      </Text>
      <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
        Calendar {payload.calendar.name} · {payload.calendar.periods.length} periods ·{' '}
        {payload.calendar.rollups.length} rollups
      </Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        Scale {payload.default_scale_id} · GPA {payload.gpa_mode} · credit {payload.credit_policy.unit}
      </Text>
      {errors.length ? (
        <View style={{ marginTop: 12 }}>
          {errors.map((e) => (
            <Text key={e.path + e.message} style={[type.meta, { color: colors.danger }]}>
              {e.message}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={[type.meta, { color: colors.brand, marginTop: 12 }]}>
          Ready to publish. Classes will bind to the new calendar.
        </Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  helpHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nav: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 8 },
  flash: { marginTop: 8 },
  lockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
