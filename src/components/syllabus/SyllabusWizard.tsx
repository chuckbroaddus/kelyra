/**
 * GB-08 Syllabus wizard shell (T1–T8). Step bodies patched in.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { type } from '@/constants/theme';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { formatPct, runLivePreview } from '@/components/syllabus/livePreview';
import {
  STEP_HELP_KEYS,
  STEP_LABELS,
  canFinishReview,
  setWizardStep,
  soFarSummary,
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
  danger: string;
  line: string;
  good: string;
  warn: string;
};

type Props = {
  draft: SyllabusWizardDraft;
  onChange: (next: SyllabusWizardDraft) => void;
  busy?: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  footer?: React.ReactNode;
};

function HelpCard({ step, colors }: { step: WizardStepId; colors: Colors }) {
  const [open, setOpen] = useState(true);
  const help = getBundledHelpTopic(STEP_HELP_KEYS[step]);
  if (!help) return null;
  if (!open) return <GhostButton label="Show help" onPress={() => setOpen(true)} />;
  return (
    <Card>
      <View style={styles.helpHead}>
        <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{help.title}</Text>
        <GhostButton label="Hide" onPress={() => setOpen(false)} />
      </View>
      <Text style={[type.meta, { color: colors.mute }]}>{help.meaning}</Text>
      {help.example ? (
        <Text style={[type.meta, { color: colors.ink, marginTop: 6 }]}>Example: {help.example}</Text>
      ) : null}
    </Card>
  );
}

function LivePreviewCard({ draft, colors }: { draft: SyllabusWizardDraft; colors: Colors }) {
  const preview = useMemo(() => runLivePreview(draft), [draft]);
  return (
    <Card>
      <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>Preview with sample students</Text>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 8 }]}>
        Three made-up students. Their grades update as you make choices.
      </Text>
      {preview.students.map((s) => (
        <View key={s.id} style={[styles.previewRow, { borderColor: colors.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: colors.ink }]}>{s.name}</Text>
            <Text style={[type.meta, { color: colors.mute }]}>{s.note}</Text>
          </View>
          <Text style={[type.title, { color: s.pct == null ? colors.mute : colors.brand }]}>
            {formatPct(s.pct)}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export function SyllabusWizard({ draft, onChange, busy, onSaveDraft, onPublish, footer }: Props) {
  const { colors } = useTheme();
  const c = colors as Colors;
  const steps = visibleSteps(draft);
  const step = steps.includes(draft.step) ? draft.step : steps[0]!;
  const stepIndex = steps.indexOf(step);
  const issues = validateWizard(draft);
  const summary = soFarSummary(draft);

  const go = (id: WizardStepId) => onChange(setWizardStep(draft, id));
  const next = () => {
    const i = stepIndex + 1;
    if (i < steps.length) go(steps[i]!);
  };
  const back = () => {
    const i = stepIndex - 1;
    if (i >= 0) go(steps[i]!);
  };

  return (
    <View>
      <Text style={[type.meta, { color: c.mute, marginBottom: 8 }]}>{summary}</Text>
      <ChipRow>
        {steps.map((id) => (
          <Chip key={id} label={STEP_LABELS[id]} selected={id === step} quiet={id !== step} onPress={() => go(id)} />
        ))}
      </ChipRow>
      <HelpCard step={step} colors={c} />
      <LivePreviewCard draft={draft} colors={c} />
      <Card>
        <Text style={[type.title, { color: c.ink, marginBottom: 12 }]}>{STEP_LABELS[step]}</Text>
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
                  label={iss.path.startsWith('categories') ? 'Edit weights' : `Go to ${STEP_LABELS[iss.step]}`}
                  onPress={() => go(iss.step!)}
                  disabled={Boolean(busy)}
                />
              ) : null}
            </View>
          ))}
        </Card>
      ) : null}
      <View style={styles.nav}>
        {/* Each button takes half the row (full-width buttons pushed Publish off a 375px screen). */}
        <View style={styles.navCell}>
          <SecondaryButton label="Back" onPress={back} disabled={stepIndex <= 0 || Boolean(busy)} />
        </View>
        <View style={styles.navCell}>
          {step !== 'review' ? (
            <PrimaryButton label="Continue" onPress={next} disabled={Boolean(busy)} />
          ) : (
            <PrimaryButton
              label={busy ? 'Publishing…' : 'Publish syllabus'}
              onPress={onPublish}
              disabled={Boolean(busy) || !canFinishReview(draft)}
            />
          )}
        </View>
      </View>
      <GhostButton
        label={busy ? 'Saving…' : 'Save draft'}
        onPress={onSaveDraft}
        disabled={Boolean(busy) || !canFinishReview(draft)}
      />
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  helpHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nav: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, marginBottom: 8 },
  navCell: { flex: 1, minWidth: 0 },
});
