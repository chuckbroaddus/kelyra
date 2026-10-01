/**
 * GB-07 School Grading and Reporting Policy wizard (office admin).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { FormSheet } from '@/components/ui/FormSheet';
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
import { applyInterviewToSetupDraft, takeInterviewHandoff } from '@/lib/interview';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { useWebIngestFixtureHook } from '@/lib/ingest/webIngestFixtureHook';
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
  type SyllabusLockReasons,
  type WizardStepId,
  DEFAULT_LOCK_REASON_COPY,
} from '@/lib/school/gradingPolicy';
import type { GpaProfile } from '@/lib/grade/gpa/gpa';
import type { TemplateKey } from '@/lib/grade/calendar/types';
import { ROLLUP_PRESET_KEYS, presetsForChildCount } from '@/lib/grade/calendar/index';
import { listScaleTemplates, makeScaleFromTemplate } from '@/lib/grade/scale/scale';
import { useTheme } from '@/lib/theme/ThemeProvider';
import {
  calendarNameLabel,
  calendarTemplateLabel,
  creditUnitLabel,
  gpaModeLabel,
  lockFieldLabel,
  qpMethodLabel,
  rollupPresetLabel,
  scaleLabel,
  schoolLevelLabel,
} from '@/lib/grade/plainLabels';

const LEVELS: SchoolLevelChoice[] = ['elementary', 'middle', 'high', 'college', 'mixed'];
const TEMPLATES: TemplateKey[] = [
  'tx_six_weeks',
  'nine_weeks',
  'trimester',
  'college_term',
  'elementary_year_4',
  'elementary_year_6',
  'semester',
];

export default function GradingPolicyWizardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { profile } = useAuth();
  const office = isOfficeRole(profile);
  const schoolId = profile?.school_id ?? '';
  const { width } = useWindowDimensions();
  const narrow = width <= 400;
  usePushedTitle('Grading policy');

  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [step, setStep] = useState<WizardStepId>('level');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ingestProposal, setIngestProposal] = useState<IngestProposal | null>(null);
  const [ingestCamera, setIngestCamera] = useState(false);

  useEffect(() => {
    if (!schoolId) return;
    const empty = createEmptyDraft(schoolId, 'high');
    // GB-12 interview hand-off: merged with the same mergeIntoSetupDraft as document ingest.
    const interview = from === 'interview' ? takeInterviewHandoff('school', schoolId) : null;
    if (interview) {
      setDraft({ ...applyInterviewToSetupDraft(empty, interview), current_step: 'review' });
      setStep('review');
      setStatus('Your answers are filled in. Check each step, then publish.');
    } else {
      setDraft(empty);
    }
  }, [schoolId, from]);

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

  const runSchoolIngest = useCallback(async (uri: string, mimeType: string) => {
    if (!schoolId || !profile?.id) return;
    setBusy(true);
    setError(null);
    setStatus('Reading your policy document…');
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
      setStatus('Done reading. Check each setting we found, then tap Use these settings.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that document');
    } finally {
      setBusy(false);
    }
  }, [schoolId, profile?.id]);

  useWebIngestFixtureHook('school_policy', runSchoolIngest);

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
    setStatus('Settings added. Look over each step, then publish.');
  };

  if (!office) {
    return (
      <Screen maxWidth={640}>
        <Text style={[type.body, { color: colors.danger }]}>
          Only school office staff can set the grading policy. Switch to your office account to continue.
        </Text>
      </Screen>
    );
  }

  if (!draft || !payload) {
    return (
      <Screen maxWidth={640}>
        <Text style={[type.body, { color: colors.mute }]}>Loading…</Text>
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
          sourceLabel="your policy document"
          onApply={applyIngestFields}
          onDiscard={() => {
            setIngestProposal(null);
            setStatus('Thrown away. Your published policy did not change.');
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

      {/* §11.18: on phone-width, help opens as a sheet (not an inline card that steals vertical space). */}
      <GhostButton
        label={helpOpen ? 'Hide help' : 'Show help'}
        onPress={() => setHelpOpen((v) => !v)}
      />
      {narrow ? (
        <FormSheet
          visible={Boolean(helpOpen && help)}
          title={help?.title ?? 'Help'}
          onClose={() => setHelpOpen(false)}
        >
          {help ? (
            <>
              <Text style={[type.meta, { color: colors.mute }]}>{help.meaning}</Text>
              {help.example ? (
                <Text style={[type.meta, { color: colors.ink, marginTop: 6 }]}>
                  Example: {help.example}
                </Text>
              ) : null}
            </>
          ) : null}
        </FormSheet>
      ) : helpOpen && help ? (
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
      ) : null}

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
                    `Published (version ${result.plan.next_version}). ${result.binding?.class_ids.length ?? 0} classes now use this grading calendar.`,
                  );
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not publish');
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
            label={schoolLevelLabel(lvl)}
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
        <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>How often grades are posted</Text>
        <ChipRow>
          {TEMPLATES.map((t) => (
            <Chip
              key={t}
              label={calendarTemplateLabel(t)}
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
        <GhostButton label="I'm not sure — use the usual choice" onPress={() => setDraft(applyTemplateNotSure(draft))} />
        <Text style={[type.meta, { color: colors.mute, marginTop: 12 }]}>
          Grading periods:{' '}
          {payload.calendar.periods
            .filter((p) => p.kind === 'marking_period')
            .map((p) => p.name)
            .join(', ')}
        </Text>
      </>
    );
  }
  if (step === 'dates') {
    // §11.14: six-weeks shows six marking-period date rows (not quarter fields / term+exam clutter).
    const dateRows = payload.calendar.periods.filter((p) => p.kind === 'marking_period');
    return (
      <>
        <TextField
          label="First day of school (like 2026-08-15)"
          value={getFieldValue(draft, 'calendar.year_start', '') ?? ''}
          onChangeText={(v) => {
            let d = setField(draft, 'calendar.year_start', v || null, 'user');
            d = rebuildCalendarFromDraft(d);
            setDraft(d);
          }}
        />
        <TextField
          label="Last day of school (like 2027-05-28)"
          value={getFieldValue(draft, 'calendar.year_end', '') ?? ''}
          onChangeText={(v) => {
            let d = setField(draft, 'calendar.year_end', v || null, 'user');
            d = rebuildCalendarFromDraft(d);
            setDraft(d);
          }}
        />
        {dateRows.map((p) => (
          <ListRow
            key={p.code}
            title={p.name}
            status={`${p.start_date ?? '—'} to ${p.end_date ?? '—'}`}
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
              ['semester_0_5', '½ credit per semester'],
              ['year_1_0', '1 credit per year'],
              ['none', 'No credit'],
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
          label={
            cur.year_link
              ? 'Average both semesters for credit: on'
              : 'Average both semesters for credit: off'
          }
          selected={cur.year_link}
          onPress={() =>
            setDraft(setField(draft, 'credit.policy', { ...cur, year_link: !cur.year_link }, 'user'))
          }
        />
        <View style={{ height: 12 }} />
        <Text style={[type.meta, { color: colors.mute }]}>
          Grades from other schools: the percent each letter counts as. Leave a box empty to use the usual value.
        </Text>
        {(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'] as const).map(
          (L) => {
            const map = getFieldValue<Record<string, number>>(
              draft,
              'credit.transfer_letter_to_pct',
              {},
            );
            return (
              <TextField
                key={L}
                label={`${L} from another school (%)`}
                value={map[L] != null ? String(map[L]) : ''}
                onChangeText={(v) => {
                  const n = v.trim() === '' ? undefined : Number(v);
                  const next = { ...map };
                  if (n == null || !Number.isFinite(n)) delete next[L];
                  else next[L] = n;
                  setDraft(setField(draft, 'credit.transfer_letter_to_pct', next, 'user'));
                }}
                keyboardType="decimal-pad"
              />
            );
          },
        )}
        <View style={{ height: 12 }} />
        <Text style={[type.meta, { color: colors.mute }]}>Let students skip the semester exam (off unless you turn it on)</Text>
        <Chip
          label={
            (cur.exam_exemption?.enabled ?? false)
              ? 'Exam skipping: on'
              : 'Exam skipping: off'
          }
          selected={cur.exam_exemption?.enabled === true}
          onPress={() => {
            const ee = cur.exam_exemption ?? {
              enabled: false,
              min_avg: null,
              max_absences: null,
              renormalize: true,
            };
            setDraft(
              setField(
                draft,
                'credit.policy',
                { ...cur, exam_exemption: { ...ee, enabled: !ee.enabled } },
                'user',
              ),
            );
          }}
        />
        {cur.exam_exemption?.enabled ? (
          <>
            <TextField
              label="Lowest average needed to skip (%)"
              keyboardType="numeric"
              value={
                cur.exam_exemption.min_avg == null ? '' : String(cur.exam_exemption.min_avg)
              }
              onChangeText={(text) => {
                const ee = cur.exam_exemption!;
                const n = text.trim() === '' ? null : Number(text);
                setDraft(
                  setField(
                    draft,
                    'credit.policy',
                    {
                      ...cur,
                      exam_exemption: {
                        ...ee,
                        min_avg: n == null || !Number.isFinite(n) ? null : n,
                      },
                    },
                    'user',
                  ),
                );
              }}
            />
            <TextField
              label="Most absences allowed to skip"
              keyboardType="numeric"
              value={
                cur.exam_exemption.max_absences == null
                  ? ''
                  : String(cur.exam_exemption.max_absences)
              }
              onChangeText={(text) => {
                const ee = cur.exam_exemption!;
                const n = text.trim() === '' ? null : Number(text);
                setDraft(
                  setField(
                    draft,
                    'credit.policy',
                    {
                      ...cur,
                      exam_exemption: {
                        ...ee,
                        max_absences: n == null || !Number.isFinite(n) ? null : n,
                      },
                    },
                    'user',
                  ),
                );
              }}
            />
            <Chip
              label={
                cur.exam_exemption.renormalize !== false
                  ? 'Spread the exam’s weight over the grading periods'
                  : 'Don’t spread the exam’s weight'
              }
              selected={cur.exam_exemption.renormalize !== false}
              onPress={() => {
                const ee = cur.exam_exemption!;
                setDraft(
                  setField(
                    draft,
                    'credit.policy',
                    {
                      ...cur,
                      exam_exemption: { ...ee, renormalize: ee.renormalize === false },
                    },
                    'user',
                  ),
                );
              }}
            />
          </>
        ) : null}
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
            label={rollupPresetLabel(key)}
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
              label={scaleLabel(t.key, t.name)}
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
        <Text style={[type.meta, { color: colors.mute, marginBottom: 6 }]}>How GPA points are given</Text>
        <ChipRow>
          {(
            [
              ['letter_map', 'By letter grade'],
              ['numeric_band', 'By percent range (6.0 chart)'],
              ['percent_map', 'By exact percent'],
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
              {qpMethodLabel(t.method)}
            </Text>
            <Text style={[type.meta, { color: colors.mute }]}>
              {t.method === 'numeric_band'
                ? t.rows
                    .slice(0, 3)
                    .map(
                      (r) =>
                        `${r.min_pct}–${r.max_pct}%: regular ${r.points_by_level.regular}, honors ${r.points_by_level.honors ?? '—'}, AP ${r.points_by_level.ap ?? '—'}`,
                    )
                    .join(' · ')
                : t.rows
                    .slice(0, 6)
                    .map((r) => `${r.letter ?? '?'} = ${r.points_by_level.regular ?? '—'}`)
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
              status={
                l.weighted_bonus
                  ? `${l.weighted_bonus > 0 ? '+' : ''}${l.weighted_bonus} extra GPA points`
                  : 'No extra GPA points'
              }
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
              ['off', 'No GPA'],
              ['unweighted', 'Unweighted only'],
              ['unweighted_and_weighted', 'Unweighted and weighted'],
              ['with_rank', 'Unweighted, weighted, and class rank'],
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
        <Text style={[type.meta, { color: colors.mute, marginTop: 10 }]}>When a student repeats a course</Text>
        <ChipRow>
          {(
            [
              ['include_both', 'Count both grades'],
              ['replace', 'Count only the new grade'],
              ['average', 'Average the two'],
              ['forgive_d_f', 'Drop an old D or F'],
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
          Whether PE and athletics count depends on the GPA type. Class rank leaves out more courses.
        </Text>
      </>
    );
  }
  if (step === 'locks') {
    const locks = getFieldValue<SyllabusLocks>(draft, 'locks.map', payload.locks);
    const reasons = getFieldValue<SyllabusLockReasons>(draft, 'locks.reasons', payload.lock_reasons ?? {});
    return (
      <>
        <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
          Teachers can see settings you lock, but can’t change them. Add a short reason so they know why.
        </Text>
        {(Object.keys(locks) as Array<keyof SyllabusLocks>).map((key) => {
          const on = locks[key];
          return (
            <View key={key} style={[styles.lockBlock, { borderColor: colors.line }]}>
              <Pressable
                onPress={() => {
                  const nextLocks = { ...locks, [key]: !on };
                  let d = setField(draft, 'locks.map', nextLocks, 'user');
                  const nextReasons = { ...reasons };
                  if (!on) {
                    nextReasons[key] = reasons[key] ?? DEFAULT_LOCK_REASON_COPY[key];
                  } else {
                    delete nextReasons[key];
                  }
                  d = setField(d, 'locks.reasons', nextReasons, 'user');
                  setDraft(d);
                }}
                style={styles.lockRow}
              >
                <Text style={[type.body, { color: colors.ink }]}>{lockFieldLabel(key)}</Text>
                <Text style={[type.meta, { color: on ? colors.brand : colors.mute }]}>
                  {on ? 'Locked' : 'Teachers can change'}
                </Text>
              </Pressable>
              {on ? (
                <TextField
                  label="Why it is locked (teachers see this)"
                  placeholder={DEFAULT_LOCK_REASON_COPY[key]}
                  value={reasons[key] ?? ''}
                  onChangeText={(text) =>
                    setDraft(
                      setField(
                        draft,
                        'locks.reasons',
                        { ...reasons, [key]: text },
                        'user',
                      ),
                    )
                  }
                />
              ) : null}
            </View>
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
        {calendarNameLabel(payload.calendar.name)} ·{' '}
        {payload.calendar.periods.filter((p) => p.kind === 'marking_period').length} grading periods
      </Text>
      <Text style={[type.meta, { color: colors.mute }]}>
        {scaleLabel(payload.default_scale_id, payload.scales[0]?.name)} · {gpaModeLabel(payload.gpa_mode)} ·{' '}
        {creditUnitLabel(payload.credit_policy.unit)}
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
          Ready to publish. All your school’s classes will use this grading calendar.
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
  },
  lockBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    marginBottom: 4,
  },
});
