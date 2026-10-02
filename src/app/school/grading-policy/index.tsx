/**
 * GB-07 School Grading and Reporting Policy wizard (office admin).
 * Chrome parity with Syllabus: pinned step tabs, action tray, badges, TopicHelp.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { ListRow } from '@/components/ui/ListRow';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WorkingLine } from '@/components/ui/WorkingMark';
import { type IconName } from '@/components/ui/Icon';
import { WizardActionTray } from '@/components/wizard/WizardActionTray';
import { LockedField } from '@/components/syllabus/WizardStepBody';
import { TopicHelpHit, TopicHelpPop, TopicHelpLabel, useTopicHelp } from '@/components/syllabus/TopicHelp';
import { formatRollupFormulaDisplay } from '@/components/syllabus/schoolPeriodSplit';
import { IngestPendingPagesCard } from '@/components/ingest/IngestPendingPagesCard';
import { IngestProposalReview } from '@/components/ingest/IngestProposalReview';
import { type } from '@/constants/theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useChrome, usePushedTitle } from '@/lib/chrome/ChromeProvider';
import {
  MAX_GRADING_DOC_PAGES,
  maxPagesCopy,
  readingStatusForPages,
  uploadGradingDocPages,
} from '@/lib/ingest/gradingDocPages';
import { invokeIngestGradingDoc } from '@/lib/ingest/invokeIngest';
import { mergeIntoSetupDraft } from '@/lib/ingest/pathMapping';
import { applyInterviewToSetupDraft, takeInterviewHandoff } from '@/lib/interview';
import type { IngestField, IngestProposal } from '@/lib/ingest/proposalTypes';
import { useWebIngestFixtureHook } from '@/lib/ingest/webIngestFixtureHook';
import { pickNormalizedPhotos, webCameraNeeded } from '@/lib/media/pickPhoto';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { isOfficeRole } from '@/lib/school/roles';
import {
  STEP_LABELS,
  STEP_HELP_KEYS,
  STEP_ICONS,
  applyLevelDefaults,
  applyTemplateNotSure,
  canPublish,
  createEmptyDraft,
  defaultGpaProfiles,
  draftToPayload,
  draftFromStoredPayload,
  getFieldValue,
  hardErrors,
  loadLatestDraft,
  loadLatestPublished,
  publishPolicy,
  rebuildCalendarFromDraft,
  resolvePolicyStep,
  saveDraftPayload,
  setField,
  setPolicyStep,
  soFarSummary,
  validatePolicyPayload,
  qualityTablesForMethod,
  visiblePolicySteps,
  templatesForLevel,
  periodSplitSummary,
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
import { ROLLUP_PRESET_KEYS, presetsForChildCount } from '@/lib/grade/calendar/index';
import { listScaleTemplates, makeScaleFromTemplate } from '@/lib/grade/scale/scale';
import {
  isStepContinued,
  markStepContinued,
  mergeBadgeMaps,
  loadStepBadges,
  saveStepBadges,
  type StepBadgeMap,
} from '@/lib/syllabus/stepBadgeStore';
import { useTheme } from '@/lib/theme/ThemeProvider';
import {
  calendarNameLabel,
  calendarTemplateLabel,
  creditUnitLabel,
  gpaModeLabel,
  lockFieldLabel,
  qpMethodLabel,
  scaleLabel,
  schoolLevelLabel,
} from '@/lib/grade/plainLabels';

const LEVELS: SchoolLevelChoice[] = ['elementary', 'middle', 'high', 'college', 'mixed'];

function policyBadgeKey(schoolId: string) {
  return `policy:${schoolId}`;
}

function policyPersonTabs(draft: SetupDraft, continued: StepBadgeMap): PersonTab[] {
  return visiblePolicySteps(draft).map((id, i) => ({
    key: id,
    label: STEP_LABELS[id],
    icon: STEP_ICONS[id] as IconName,
    stepMark: { n: i + 1, done: isStepContinued(continued, id) },
  }));
}
export default function GradingPolicyWizardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const chrome = useChrome();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { profile } = useAuth();
  const office = isOfficeRole(profile);
  const schoolId = profile?.school_id ?? '';
  usePushedTitle('Grading policy');

  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [draftRowId, setDraftRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [ingestProposal, setIngestProposal] = useState<IngestProposal | null>(null);
  const [ingestCamera, setIngestCamera] = useState(false);
  const [pendingIngestPages, setPendingIngestPages] = useState<
    Array<{ key: string; uri: string; mimeType: string }>
  >([]);
  const [savedBadges, setSavedBadges] = useState<StepBadgeMap>({});
  const [visitBadges, setVisitBadges] = useState<StepBadgeMap>({});
  const stepScrollRef = useRef<ScrollView>(null);
  const interviewRef = useRef<ReturnType<typeof takeInterviewHandoff>>(null);

  const appendIngestPages = useCallback((pages: Array<{ uri: string; mimeType: string }>) => {
    if (!pages.length) return;
    setPendingIngestPages((current) => {
      const room = Math.max(0, MAX_GRADING_DOC_PAGES - current.length);
      if (room <= 0) return current;
      const add = pages.slice(0, room).map((page, index) => ({
        key: `${Date.now()}-${current.length + index}-${Math.random().toString(36).slice(2, 6)}`,
        uri: page.uri,
        mimeType: page.mimeType || 'image/jpeg',
      }));
      return [...current, ...add];
    });
    if (pages.length > MAX_GRADING_DOC_PAGES) setStatus(maxPagesCopy());
  }, []);

  useFocusEffect(
    useCallback(() => {
      chrome.setTrayBump(true);
      return () => {
        chrome.setTrayBump(false);
        setVisitBadges({});
      };
    }, [chrome.setTrayBump]),
  );

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      if (from === 'interview' && !interviewRef.current) {
        interviewRef.current = takeInterviewHandoff('school', schoolId);
      }
      const interview = from === 'interview' ? interviewRef.current : null;
      const [draftRow, pubRow, badges] = await Promise.all([
        loadLatestDraft(schoolId).catch(() => null),
        loadLatestPublished(schoolId).catch(() => null),
        loadStepBadges(policyBadgeKey(schoolId)),
      ]);
      setSavedBadges(badges);
      setVisitBadges({});
      let next = createEmptyDraft(schoolId, 'high');
      let nextStatus: string | null = null;
      if (draftRow?.payload) {
        next = draftFromStoredPayload(schoolId, draftRow.payload as never, 'level');
        setDraftRowId(draftRow.id);
        nextStatus = 'Loaded your saved draft.';
      } else if (pubRow?.payload) {
        next = draftFromStoredPayload(schoolId, pubRow.payload as never, 'level');
        setDraftRowId(null);
        nextStatus = 'Starting from the published policy. Save draft to keep edits.';
      } else {
        setDraftRowId(null);
      }
      if (interview) {
        next = setPolicyStep(applyInterviewToSetupDraft(next, interview), 'review');
        nextStatus = 'Your answers are filled in. Check each step, then publish.';
      }
      setDraft(next);
      if (nextStatus) setStatus(nextStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load grading policy');
      setDraft(createEmptyDraft(schoolId, 'high'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, from]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (!draft) return;
    stepScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [draft?.current_step]);

  const payload = useMemo(() => (draft ? draftToPayload(draft) : null), [draft]);
  const issues = useMemo(() => (payload ? validatePolicyPayload(payload) : []), [payload]);
  const errors = useMemo(() => hardErrors(issues), [issues]);
  const step = draft ? resolvePolicyStep(draft) : 'level';
  const steps = draft ? visiblePolicySteps(draft) : [];
  const stepIndex = steps.indexOf(step);
  const stepHelp = useTopicHelp(STEP_HELP_KEYS[step], step);
  const continued = mergeBadgeMaps(savedBadges, visitBadges);
  const last = stepIndex >= 0 && stepIndex === steps.length - 1;

  const go = useCallback((id: WizardStepId) => {
    stepScrollRef.current?.scrollTo({ y: 0, animated: false });
    setDraft((d) => (d ? setPolicyStep(d, id) : d));
  }, []);

  const onBack = () => {
    if (stepIndex <= 0) return;
    go(steps[stepIndex - 1]!);
  };
  const onContinue = () => {
    if (stepIndex < 0 || stepIndex >= steps.length - 1 || !draft) return;
    setVisitBadges((prev) => markStepContinued(prev, step));
    go(steps[stepIndex + 1]!);
  };

  const runSchoolIngest = useCallback(async (pages: Array<{ uri: string; mimeType: string }>) => {
    if (!schoolId || !profile?.id) return;
    if (!pages.length) return;
    setBusy(true);
    setError(null);
    setStatus(readingStatusForPages(pages.length));
    try {
      const uploaded = await uploadGradingDocPages({
        teacherId: profile.id,
        pages,
      });
      if (uploaded.truncated) setStatus(maxPagesCopy());
      const { proposal } = await invokeIngestGradingDoc({
        kind: 'school_policy',
        school_id: schoolId,
        storage_paths: uploaded.storage_paths,
        image_urls: uploaded.image_urls,
        source_id: uploaded.source_id,
      });
      setPendingIngestPages([]);
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
    try {
      const photos = await pickNormalizedPhotos({ max: MAX_GRADING_DOC_PAGES });
      if (!photos?.length) return;
      appendIngestPages(photos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open document');
    }
  };

  const onAddIngestCameraPage = () => {
    if (webCameraNeeded(true)) {
      setIngestCamera(true);
      return;
    }
    void (async () => {
      try {
        const photos = await pickNormalizedPhotos({ max: 1, fromCamera: true });
        if (!photos?.length) return;
        appendIngestPages(photos);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not open camera');
      }
    })();
  };

  const applyIngestFields = (accepted: IngestField[]) => {
    if (!draft || !ingestProposal) return;
    const filtered: IngestProposal = { ...ingestProposal, fields: accepted };
    const { setup } = mergeIntoSetupDraft(draft, filtered);
    setDraft(setup);
    setIngestProposal(null);
    setStatus('Settings added. Look over each step, then publish.');
  };

  const onSaveDraft = async () => {
    if (!schoolId || !draft || !payload) return;
    setBusy(true);
    setError(null);
    try {
      const row = await saveDraftPayload(schoolId, payload, draftRowId);
      setDraftRowId(row.id);
      const nextMap = mergeBadgeMaps(savedBadges, visitBadges);
      await saveStepBadges(policyBadgeKey(schoolId), nextMap);
      setSavedBadges(nextMap);
      setVisitBadges({});
      setStatus(
        canPublish(payload)
          ? 'Draft saved. It won’t change class calendars until you publish.'
          : 'Draft saved. Fix the items under Review before you can publish.',
      );
      interviewRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft');
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async () => {
    if (!schoolId || !draft || !payload) return;
    if (!canPublish(payload)) {
      setError('Fix the validation items on Review before you can publish.');
      setConfirmPublish(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveDraftPayload(schoolId, payload, draftRowId);
      const result = await publishPolicy(schoolId, payload);
      const withReview = markStepContinued(mergeBadgeMaps(savedBadges, visitBadges), 'review');
      await saveStepBadges(policyBadgeKey(schoolId), withReview);
      setSavedBadges(withReview);
      setVisitBadges({});
      setConfirmPublish(false);
      setDraftRowId(null);
      setStatus(
        `Published (version ${result.plan.next_version}). ${result.binding?.class_ids.length ?? 0} classes now use this grading calendar.`,
      );
      interviewRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish');
    } finally {
      setBusy(false);
    }
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

  if (loading || !draft || !payload) {
    return (
      <Screen maxWidth={640}>
        {error ? <Text style={[type.body, { color: colors.danger }]}>{error}</Text> : <WorkingLine />}
      </Screen>
    );
  }

  const summary = soFarSummary(draft);
  const stepTabs = (
    <PersonTabs
      tabs={policyPersonTabs(draft, continued)}
      value={step}
      compact
      stacked
      onChange={(key) => go(key as WizardStepId)}
    />
  );

  const stickyNav = (
    <WizardActionTray
      stepIndex={Math.max(0, stepIndex)}
      stepCount={steps.length}
      stepLabel={STEP_LABELS[step]}
      busy={busy}
      status={status}
      error={error}
      canBack={stepIndex > 0 && !busy}
      canNext={!last && !busy}
      showSave={!last}
      showPublish={last}
      saveDisabled={false}
      publishDisabled={!canPublish(payload) || !schoolId}
      onBack={onBack}
      onContinue={onContinue}
      onSaveDraft={() => void onSaveDraft()}
      onPublish={() => {
        setError(null);
        setStatus(null);
        setConfirmPublish(true);
      }}
      icons={[
        {
          key: 'questions',
          label: 'Answer a few questions',
          icon: 'syllabusInterview',
          onPress: () => router.push('/school/grading-policy/interview' as never),
        },
        {
          key: 'capture',
          label: 'Import policy with Capture',
          icon: 'capture',
          onPress: () => void onStartFromDocument(),
        },
        {
          key: 'template',
          label: "I'm not sure — use the usual choice",
          icon: 'syllabusTemplate',
          onPress: () => setDraft(applyTemplateNotSure(draft)),
        },
      ]}
    />
  );

  return (
    <View style={styles.shell} pointerEvents="box-none">
      <Screen keyboard pageChromeHosted pin={stepTabs} scrollRef={stepScrollRef} maxWidth={720}>
        <Card>
          <Text style={[type.meta, { color: colors.mute }]}>{summary}</Text>
          <Text style={[type.body, { color: colors.ink, marginTop: 4 }]}>
            Step through each choice. Nothing changes class calendars until you publish.
          </Text>
        </Card>

        {pendingIngestPages.length ? (
          <IngestPendingPagesCard
            pages={pendingIngestPages}
            busy={busy}
            canAddMore={pendingIngestPages.length < MAX_GRADING_DOC_PAGES}
            onRemove={(key) => setPendingIngestPages((cur) => cur.filter((p) => p.key !== key))}
            onAddAnother={onAddIngestCameraPage}
            onRead={() =>
              void runSchoolIngest(pendingIngestPages.map((p) => ({ uri: p.uri, mimeType: p.mimeType })))
            }
            onClear={() => setPendingIngestPages([])}
          />
        ) : null}
        {ingestCamera ? (
          <WebCameraCapture
            onCapture={(uri, mimeType) => {
              setIngestCamera(false);
              appendIngestPages([{ uri, mimeType }]);
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

        <Card>
          <View style={styles.titleRow}>
            <Text style={[type.title, { color: colors.ink, flex: 1 }]}>{STEP_LABELS[step]}</Text>
            {stepHelp.help ? (
              <TopicHelpHit
                open={stepHelp.open}
                label={STEP_LABELS[step]}
                colors={colors}
                onPress={stepHelp.toggle}
              />
            ) : null}
          </View>
          {stepHelp.open && stepHelp.help ? <TopicHelpPop help={stepHelp.help} colors={colors} /> : null}
          <WizardStepBody
            step={step}
            draft={draft}
            payload={payload}
            colors={colors}
            setDraft={setDraft}
            errors={errors}
          />
        </Card>

        {busy ? <WorkingLine /> : null}
        <GhostButton label="Close" onPress={() => router.back()} />

        <ConfirmSheet
          visible={confirmPublish}
          title="Publish grading policy?"
          body="All classes at this school will use this grading calendar. Teachers keep settings you did not lock."
          confirmLabel="Publish"
          busy={busy}
          error={error}
          onCancel={() => setConfirmPublish(false)}
          onConfirm={() => void doPublish()}
        />
      </Screen>
      <View pointerEvents="box-none" style={styles.navHost}>
        {stickyNav}
      </View>
    </View>
  );
}

type BodyProps = {
  step: WizardStepId;
  draft: SetupDraft;
  payload: ReturnType<typeof draftToPayload>;
  colors: {
    ink: string;
    mute: string;
    brand: string;
    danger: string;
    line: string;
    good: string;
    warn: string;
  };
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
    const level = getFieldValue<SchoolLevelChoice>(draft, 'level', 'high');
    const templates = templatesForLevel(level);
    const split = periodSplitSummary(payload);
    return (
      <>
        <TopicHelpLabel title="How often grades are posted" topicKey="help.glyphs.6w" colors={colors} />
        <ChipRow>
          {templates.map((t) => (
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
        <LockedField locked colors={colors}>
          <TextField label="Period split from this calendar" value={split} editable={false} />
          <Text style={[type.meta, { color: colors.mute, marginTop: 8 }]}>
            Grading periods:{' '}
            {payload.calendar.periods
              .filter((p) => p.kind === 'marking_period')
              .map((p) => p.name)
              .join(', ')}
          </Text>
        </LockedField>
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
    const cal = getFieldValue<{
      period_model?: string;
      periods?: { id: string; kind: string; parent_id: string | null }[];
    } | null>(draft, 'calendar.model', null);
    const firstTerm = cal?.periods?.find((p) => p.kind === 'credit_term');
    const childCount = firstTerm
      ? (cal?.periods ?? []).filter((p) => p.kind === 'marking_period' && p.parent_id === firstTerm.id).length
      : (cal?.periods ?? []).filter((p) => p.kind === 'marking_period').length;
    const presetKeys = childCount > 0 ? presetsForChildCount(childCount) : ROLLUP_PRESET_KEYS;
    const selected = getFieldValue(draft, 'rollup.preset', '2/7+1/7');
    const formula = formatRollupFormulaDisplay(selected, {
      period_model: cal?.period_model ?? payload.calendar.period_model,
      child_count: childCount > 0 ? childCount : null,
    });
    return (
      <>
        <TopicHelpLabel title="Semester grade formula" topicKey="help.rollup.2_7" colors={colors} />
        <ChipRow>
          {presetKeys.map((key) => (
            <Chip
              key={key}
              label={formatRollupFormulaDisplay(key, {
                period_model: cal?.period_model ?? payload.calendar.period_model,
                child_count: childCount > 0 ? childCount : null,
              }) || key}
              selected={selected === key}
              onPress={() => {
                let d = setField(draft, 'rollup.preset', key, 'user');
                d = rebuildCalendarFromDraft(d);
                setDraft(d);
              }}
            />
          ))}
        </ChipRow>
        {formula ? (
          <Text style={[type.meta, { color: colors.ink, marginTop: 12 }]} accessibilityLabel="rollup-formula">
            {formula}
          </Text>
        ) : null}
      </>
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
  shell: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  navHost: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 17,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
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
