/**
 * GB-08 Syllabus wizard shell — step body + floating action tray.
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { type PersonTab } from '@/components/ui/PersonTabs';
import { chrome, shadows, type } from '@/constants/theme';
import { getBundledHelpTopic } from '@/lib/help/helpTopics';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { isStepContinued, type StepBadgeMap } from '@/lib/syllabus/stepBadgeStore';
import { useLayout } from '@/lib/theme/layout';
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
 * Separate syllabus action tray above the system tray.
 * Swipe-up hides the system tray; this tray slides down into that spot.
 * Swipe-down restores both stacked (this tray above the system tray).
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
  const { colors, scheme } = useTheme();
  const c = colors as Colors;
  const chromeState = useChrome();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const iconSize = landscape ? 22 : 24;
  const hit = landscape ? 44 : 48;
  const hInset = Math.max(insets.left, insets.right, 12);
  // Match FloatingTabTray measured system-tray rest (safe area + tray height).
  // Do NOT use chromeState.trayRest — that value is trayRestLift and already
  // includes syllabusActionTrayHeight when trayBump is on (would double-stack).
  const systemTrayBottom = landscape ? 6 + Math.max(insets.bottom, 6) : 8 + Math.max(insets.bottom, 8);
  const systemTrayHeight = landscape ? chrome.trayHeightLandscape : chrome.trayHeight;
  const stacked = !layout.showTopBar;
  const stackGap = 8;
  // Stacked: sit just above the system tray. Unstacked (web top bar): safe bottom only.
  const bottom = stacked ? systemTrayBottom + systemTrayHeight + stackGap : systemTrayBottom;
  // Swipe-up: drop into the system tray's bottom slot (same bottomInset as FloatingTabTray).
  const slideIntoTraySpot = stacked ? systemTrayHeight + stackGap : 0;
  const hideDist = Math.max(chromeState.trayHideDistance, 1);
  const actionTranslate = chromeState.trayTranslate.interpolate({
    inputRange: [0, hideDist],
    outputRange: [0, slideIntoTraySpot],
  });

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
  // Primary filled circles (same brand token as PrimaryButton); disabled only via opacity.
  const chevronBg = c.brand;
  const chevronBorder = c.brand;
  const chevronInk = c.brandInk;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.float,
        {
          left: hInset,
          right: hInset,
          bottom,
          transform: [{ translateY: actionTranslate }],
        },
      ]}
    >
      <View
        style={[
          styles.actionTray,
          {
            backgroundColor: c.elevated,
            borderColor: c.line,
            ...(scheme === 'light' ? shadows.light : null),
          },
        ]}
      >
        <View style={styles.navRow}>
          {/* Equal-width end slots keep ‹ / › outer gaps identical; mid cluster centers. */}
          <View style={styles.sideSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              disabled={!canBack}
              onPress={onBack}
              style={({ pressed }) => [
                styles.circle,
                {
                  backgroundColor: chevronBg,
                  borderColor: chevronBorder,
                  opacity: !canBack ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.circleGlyph, { color: chevronInk }]}>‹</Text>
            </Pressable>
          </View>

          <View style={styles.midCluster}>
            <HoverTip label="Answer a few questions">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Answer a few questions"
                onPress={() => router.push(`/class/${classId}/syllabus-interview` as never)}
                style={({ pressed }) => [styles.iconHit, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
              >
                <Icon name="syllabusInterview" color={c.mute} size={iconSize} />
              </Pressable>
            </HoverTip>
            <HoverTip label="Import syllabus with Capture">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Import syllabus with Capture"
                onPress={() =>
                  router.push(
                    `/capture?preset=syllabus&classId=${encodeURIComponent(classId)}` as never,
                  )
                }
                style={({ pressed }) => [styles.iconHit, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
              >
                <Icon name="capture" color={c.mute} size={iconSize} />
              </Pressable>
            </HoverTip>
            <HoverTip label="Start from a school template">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start from a school template"
                onPress={() => router.push(`/class/${classId}/syllabus-templates` as never)}
                style={({ pressed }) => [styles.iconHit, { width: hit, height: hit }, pressed && { opacity: 0.7 }]}
              >
                <Icon name="syllabusTemplate" color={c.mute} size={iconSize} />
              </Pressable>
            </HoverTip>
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
          </View>

          <View style={styles.sideSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue"
              disabled={!canNext}
              onPress={onContinue}
              style={({ pressed }) => [
                styles.circle,
                {
                  backgroundColor: chevronBg,
                  borderColor: chevronBorder,
                  opacity: !canNext ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.circleGlyph, { color: chevronInk }]}>›</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <Text style={[type.meta, { color: c.danger, textAlign: 'center', marginTop: 4 }]}>{error}</Text>
        ) : status ? (
          <Text style={[type.meta, { color: c.mute, textAlign: 'center', marginTop: 4 }]}>{status}</Text>
        ) : null}
        <Text style={[type.meta, { color: c.mute, textAlign: 'center', marginTop: 2 }]}>
          {stepIndex + 1} of {steps.length} — {STEP_LABELS[step]}
        </Text>
      </View>
    </Animated.View>
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
  float: {
    position: 'absolute',
    zIndex: 17,
  },
  actionTray: {
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    alignSelf: 'stretch',
  },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  /** Fixed width matching circle so left/right outer gutters stay equal. */
  sideSlot: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Questions + Capture + Template + Save/Publish — centered between chevrons. */
  midCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    gap: 6,
    minWidth: 0,
    paddingHorizontal: 6,
  },
  iconHit: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleGlyph: { fontSize: 26, fontWeight: '600', lineHeight: 28, marginTop: -2 },
  mid: {
    minWidth: 104,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  midSpacer: { minWidth: 104, height: 40 },
  midLabel: { ...type.body, fontWeight: '600', fontSize: 14 },
});
