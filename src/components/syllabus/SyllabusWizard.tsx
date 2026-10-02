/**
 * GB-08 Syllabus wizard shell — step body + floating action tray.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { type IconName } from '@/components/ui/Icon';
import { type PersonTab } from '@/components/ui/PersonTabs';
import { WizardActionTray } from '@/components/wizard/WizardActionTray';
import { type } from '@/constants/theme';
import { isStepContinued, type StepBadgeMap } from '@/lib/syllabus/stepBadgeStore';
import { useTheme } from '@/lib/theme/ThemeProvider';
import {
  STEP_HELP_KEYS,
  STEP_ICONS,
  STEP_LABELS,
  canFinishReview,
  canSaveDraft,
  resolveWizardStep,
  setWizardStep,
  validateWizard,
  visibleSteps,
  type SyllabusWizardDraft,
  type WizardStepId,
} from '@/components/syllabus/wizardModel';
import { TopicHelpHit, TopicHelpPop, useTopicHelp } from '@/components/syllabus/TopicHelp';
import { WizardStepBody } from '@/components/syllabus/WizardStepBody';

type Colors = {
  ink: string;
  mute: string;
  brand: string;
  brandInk: string;
  danger: string;
  line: string;
  good: string;
  warn: string;
  elevated: string;
  bg: string;
};

type Props = {
  draft: SyllabusWizardDraft;
  onChange: (next: SyllabusWizardDraft) => void;
  busy?: boolean;
  footer?: React.ReactNode;
  tabsHostedOutside?: boolean;
};

export function wizardPersonTabs(draft: SyllabusWizardDraft, continued: StepBadgeMap = {}): PersonTab[] {
  return visibleSteps(draft).map((id, i) => ({
    key: id,
    label: STEP_LABELS[id],
    icon: STEP_ICONS[id] as IconName,
    stepMark: { n: i + 1, done: isStepContinued(continued, id) },
  }));
}

export function SyllabusWizard({ draft, onChange, busy, footer, tabsHostedOutside }: Props) {
  const { colors } = useTheme();
  const c = colors as Colors;
  const steps = visibleSteps(draft);
  const step = resolveWizardStep(draft);
  const issues = validateWizard(draft);
  const stepHelp = useTopicHelp(STEP_HELP_KEYS[step], step);
  const go = (id: WizardStepId) => onChange(setWizardStep(draft, id));

  return (
    <View>
      {tabsHostedOutside ? null : null}
      <Card>
        <View style={styles.titleRow}>
          <Text style={[type.title, { color: c.ink, flex: 1 }]}>{STEP_LABELS[step]}</Text>
          {stepHelp.help ? (
            <TopicHelpHit
              open={stepHelp.open}
              label={STEP_LABELS[step]}
              colors={c}
              onPress={stepHelp.toggle}
            />
          ) : null}
        </View>
        {stepHelp.open && stepHelp.help ? <TopicHelpPop help={stepHelp.help} colors={c} /> : null}
        <WizardStepBody draft={draft} step={step} colors={c} onChange={onChange} />
      </Card>
      {issues.length ? (
        <Card>
          {issues.map((iss, i) => (
            <View key={`${iss.path}-${i}`}>
              <Text style={[type.meta, { color: iss.severity === 'error' ? c.danger : c.warn }]}>
                {iss.severity === 'error' ? 'Fix this' : 'Heads up'}: {iss.message}
              </Text>
              {iss.step && iss.step !== step && steps.includes(iss.step) ? (
                <GhostButton
                  align="left"
                  label={iss.step === 'categories' ? 'Edit weights' : `Go to ${STEP_LABELS[iss.step]}`}
                  onPress={() => go(iss.step!)}
                  disabled={Boolean(busy)}
                />
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
      {footer}
    </View>
  );
}

type NavProps = {
  draft: SyllabusWizardDraft;
  classId: string;
  busy?: boolean;
  /** Success line pinned on the action tray (scroll body is under the fold). */
  status?: string | null;
  /** Error line pinned on the action tray — never only at page bottom. */
  error?: string | null;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

/**
 * Syllabus action tray — shared WizardActionTray + class-scoped mid icons.
 */
export function SyllabusWizardNav({
  draft,
  classId,
  busy,
  status,
  error,
  onBack,
  onContinue,
  onSaveDraft,
  onPublish,
}: NavProps) {
  const router = useRouter();
  const steps = useMemo(() => visibleSteps(draft), [draft.engine, draft.categories.length]);
  const step = resolveWizardStep(draft);
  const stepIndex = steps.indexOf(step);
  const last = stepIndex >= 0 && stepIndex === steps.length - 1;
  const published = draft.syllabus_status === 'published';
  const canBack = stepIndex > 0 && !busy;
  const canNext = !last && !busy;
  const showSave = !published && !last;
  const showPublish = last;

  return (
    <WizardActionTray
      stepIndex={Math.max(0, stepIndex)}
      stepCount={steps.length}
      stepLabel={STEP_LABELS[step]}
      busy={busy}
      status={status}
      error={error}
      canBack={canBack}
      canNext={canNext}
      showSave={showSave}
      showPublish={showPublish}
      saveDisabled={!canSaveDraft(draft)}
      publishDisabled={!canFinishReview(draft)}
      onBack={onBack}
      onContinue={onContinue}
      onSaveDraft={onSaveDraft}
      onPublish={onPublish}
      icons={[
        {
          key: 'questions',
          label: 'Answer a few questions',
          icon: 'syllabusInterview',
          onPress: () => router.push(`/class/${classId}/syllabus-interview` as never),
        },
        {
          key: 'capture',
          label: 'Import syllabus with Capture',
          icon: 'capture',
          onPress: () =>
            router.push(
              `/capture?preset=syllabus&classId=${encodeURIComponent(classId)}` as never,
            ),
        },
        {
          key: 'template',
          label: 'Start from a school template',
          icon: 'syllabusTemplate',
          onPress: () => router.push(`/class/${classId}/syllabus-templates` as never),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
});
