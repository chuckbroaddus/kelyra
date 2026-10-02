/**
 * Shared floating wizard action tray (Syllabus + School grading policy).
 */
import type { ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HoverTip } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { chrome, shadows, type } from '@/constants/theme';
import { useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type WizardTrayIconAction = {
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
};

export type WizardActionTrayProps = {
  stepIndex: number;
  stepCount: number;
  stepLabel: string;
  busy?: boolean;
  status?: string | null;
  error?: string | null;
  canBack: boolean;
  canNext: boolean;
  showSave?: boolean;
  showPublish?: boolean;
  saveDisabled?: boolean;
  publishDisabled?: boolean;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  icons?: WizardTrayIconAction[];
  footer?: ReactNode;
};

type Colors = {
  ink: string;
  mute: string;
  brand: string;
  brandInk: string;
  danger: string;
  line: string;
  elevated: string;
};

/**
 * Separate action tray above the system tray.
 * Swipe-up hides the system tray; this tray slides down into that spot.
 */
export function WizardActionTray({
  stepIndex,
  stepCount,
  stepLabel,
  busy,
  status,
  error,
  canBack,
  canNext,
  showSave,
  showPublish,
  saveDisabled,
  publishDisabled,
  onBack,
  onContinue,
  onSaveDraft,
  onPublish,
  icons = [],
  footer,
}: WizardActionTrayProps) {
  const { colors, scheme } = useTheme();
  const c = colors as Colors;
  const chromeState = useChrome();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const landscape = layout.orientation === 'landscape' && layout.isPhone;
  const iconSize = landscape ? 22 : 24;
  const hInset = Math.max(insets.left, insets.right, 12);
  // Match FloatingTabTray measured system-tray rest (safe area + tray height).
  // Do NOT use chromeState.trayRest — trayRestLift already includes action tray when bump is on.
  const systemTrayBottom = landscape ? 6 + Math.max(insets.bottom, 6) : 8 + Math.max(insets.bottom, 8);
  const systemTrayHeight = landscape ? chrome.trayHeightLandscape : chrome.trayHeight;
  const stacked = !layout.showTopBar;
  const stackGap = 12;
  const bottom = stacked ? systemTrayBottom + systemTrayHeight + stackGap : systemTrayBottom;
  const slideIntoTraySpot = stacked ? systemTrayHeight + stackGap : 0;
  const hideDist = Math.max(chromeState.trayHideDistance, 1);
  const actionTranslate = chromeState.trayTranslate.interpolate({
    inputRange: [0, hideDist],
    outputRange: [0, slideIntoTraySpot],
  });

  const chevronBg = c.brand;
  const chevronBorder = c.brand;
  const chevronInk = c.brandInk;
  const saveOff = Boolean(busy) || Boolean(saveDisabled);
  const publishOff = Boolean(busy) || Boolean(publishDisabled);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.float,
        {
          left: hInset,
          right: hInset,
          bottom,
          backgroundColor: 'transparent',
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

          {icons.map((action) => (
            <HoverTip key={action.key} label={action.label}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.label}
                disabled={Boolean(busy) || action.disabled}
                onPress={action.onPress}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.iconHit,
                  (Boolean(busy) || action.disabled) && { opacity: 0.35 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Icon name={action.icon} color={c.mute} size={iconSize} />
              </Pressable>
            </HoverTip>
          ))}

          {showSave ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={busy ? 'Saving…' : 'Save draft'}
              disabled={saveOff}
              onPress={onSaveDraft}
              style={({ pressed }) => [
                styles.mid,
                {
                  backgroundColor: c.elevated,
                  borderColor: c.line,
                  opacity: saveOff ? 0.4 : pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.midLabel, { color: c.ink }]}
              >
                {busy ? 'Saving…' : 'Save draft'}
              </Text>
            </Pressable>
          ) : showPublish ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={busy ? 'Publishing…' : 'Publish'}
              disabled={publishOff}
              onPress={onPublish}
              style={({ pressed }) => [
                styles.mid,
                {
                  backgroundColor: c.brand,
                  borderColor: c.brand,
                  opacity: publishOff ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
                style={[styles.midLabel, { color: c.brandInk }]}
              >
                {busy ? 'Publishing…' : 'Publish'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.midSpacer} />
          )}

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

        {error ? (
          <Text style={[type.meta, { color: c.danger, textAlign: 'center', marginTop: 4 }]}>{error}</Text>
        ) : status ? (
          <Text style={[type.meta, { color: c.mute, textAlign: 'center', marginTop: 4 }]}>{status}</Text>
        ) : null}
        <Text style={[type.meta, { color: c.mute, textAlign: 'center', marginTop: 2 }]}>
          {stepIndex + 1} of {stepCount} — {stepLabel}
        </Text>
        {footer}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  float: {
    position: 'absolute',
    zIndex: 17,
    backgroundColor: 'transparent',
  },
  actionTray: {
    borderRadius: chrome.trayRadius,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 8,
    alignSelf: 'stretch',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    flexWrap: 'nowrap',
    minWidth: 0,
  },
  iconHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circleGlyph: { fontSize: 26, fontWeight: '600', lineHeight: 28, marginTop: -2 },
  mid: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 112,
  },
  midSpacer: { width: 72, height: 40, flexShrink: 1, minWidth: 0 },
  midLabel: { ...type.body, fontWeight: '600', fontSize: 13 },
});
