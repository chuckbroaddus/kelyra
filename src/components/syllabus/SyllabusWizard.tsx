/**
 * GB-08 Syllabus wizard shell — step body + pinned footer nav chrome.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { IconName } from '@/components/ui/Icon';
import { type PersonTab } from '@/components/ui/PersonTabs';
import { type } from '@/constants/theme';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
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
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setHelpOpen(false);
  }, [step]);

  const help = getBundledHelpTopic(STEP_HELP_KEYS[step]);
  const go = (id: WizardStepId) => onChange(setWizardStep(draft, id));

  return (
    <View>
      {tabsHostedOutside ? null : null}
      <Card>
        <View style={styles.titleRow}>
          <Text style={[type.title, { color: c.ink, flex: 1 }]}>{STEP_LABELS[step]}</Text>
          {help ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Help for ${STEP_LABELS[step]}`}
              accessibilityState={{ expanded: helpOpen }}
              onPress={() => setHelpOpen((v) => !v)}
              style={({ pressed }) => [
                styles.helpHit,
                { borderColor: c.line, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <Text style={[styles.helpGlyph, { color: c.mute }]}>?</Text>
            </Pressable>
          ) : null}
        </View>
        {helpOpen && help ? (
          <View style={[styles.helpPop, { backgroundColor: c.elevated, borderColor: c.line }]}>
            <Text style={[type.body, { color: c.ink, fontWeight: '700' }]}>{help.title}</Text>
            <Text style={[type.meta, { color: c.mute, marginTop: 4 }]}>{help.meaning}</Text>
            {help.example ? (
              <Text style={[type.meta, { color: c.ink, marginTop: 6 }]}>Example: {help.example}</Text>
            ) : null}
          </View>
        ) : null}
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
  busy?: boolean;
  /** Success line pinned above the nav (scroll body is under the fold). */
  status?: string | null;
  /** Error line pinned above the nav — never only at page bottom. */
  error?: string | null;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
};

/** Pinned footer: "{n} of {M} — {title}" + circle nav + Save draft / Publish. */
export function SyllabusWizardNav({
  draft,
  busy,
  status,
  error,
  onBack,
  onContinue,
  onSaveDraft,
  onPublish,
}: NavProps) {
  const { colors } = useTheme();
  const c = colors as Colors;
  const steps = useMemo(() => visibleSteps(draft), [draft.engine, draft.categories.length]);
  const step = resolveWizardStep(draft);
  const stepIndex = steps.indexOf(step);
  const last = stepIndex >= 0 && stepIndex === steps.length - 1;
  const published = draft.syllabus_status === 'published';
  const canBack = stepIndex > 0 && !busy;
  const canNext = !last && !busy;
  const showSave = !published && !last;
  const showPublish = last;
  const saveDisabled = Boolean(busy) || !canSaveDraft(draft);
  const publishDisabled = Boolean(busy) || !canFinishReview(draft);

  return (
    <View style={styles.navWrap}>
      {error ? (
        <Text style={[type.meta, { color: c.danger, textAlign: 'center', marginBottom: 6 }]}>{error}</Text>
      ) : status ? (
        <Text style={[type.meta, { color: c.mute, textAlign: 'center', marginBottom: 6 }]}>{status}</Text>
      ) : null}
      <Text style={[type.meta, { color: c.mute, textAlign: 'center', marginBottom: 8 }]}>
        {stepIndex + 1} of {steps.length} — {STEP_LABELS[step]}
      </Text>
      <View style={styles.navRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          disabled={!canBack}
          onPress={onBack}
          style={({ pressed }) => [
            styles.circle,
            {
              backgroundColor: c.elevated,
              borderColor: c.line,
              opacity: !canBack ? 0.35 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[styles.circleGlyph, { color: c.ink }]}>‹</Text>
        </Pressable>

        {showSave ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Saving…' : 'Save draft'}
            disabled={saveDisabled}
            onPress={onSaveDraft}
            style={({ pressed }) => [
              styles.mid,
              {
                backgroundColor: c.elevated,
                borderColor: c.line,
                opacity: saveDisabled ? 0.4 : pressed ? 0.78 : 1,
              },
            ]}
          >
            <Text style={[styles.midLabel, { color: c.ink }]}>{busy ? 'Saving…' : 'Save draft'}</Text>
          </Pressable>
        ) : showPublish ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={busy ? 'Publishing…' : 'Publish'}
            disabled={publishDisabled}
            onPress={onPublish}
            style={({ pressed }) => [
              styles.mid,
              {
                backgroundColor: c.brand,
                borderColor: c.brand,
                opacity: publishDisabled ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.midLabel, { color: c.brandInk }]}>
              {busy ? 'Publishing…' : 'Publish'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.midSpacer} />
        )}

        {!last ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue"
            disabled={!canNext}
            onPress={onContinue}
            style={({ pressed }) => [
              styles.circle,
              {
                backgroundColor: c.brand,
                borderColor: c.brand,
                opacity: !canNext ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.circleGlyph, { color: c.brandInk }]}>›</Text>
          </Pressable>
        ) : (
          <View style={styles.circleGhost} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  helpHit: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpGlyph: { fontSize: 13, fontWeight: '700', lineHeight: 16 },
  helpPop: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  navWrap: { paddingTop: 4, paddingBottom: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGhost: { width: 44, height: 44 },
  circleGlyph: { fontSize: 28, fontWeight: '600', lineHeight: 30, marginTop: -2 },
  mid: {
    minWidth: 132,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  midSpacer: { minWidth: 132, height: 44 },
  midLabel: { ...type.body, fontWeight: '600' },
});
