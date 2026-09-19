import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { type } from '@/constants/theme';
import type { DayMode, MonthMode } from '@/lib/calendar/viewPrefs';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

type Props = {
  visible: boolean;
  monthMode: MonthMode;
  dayMode: DayMode;
  onChangeMonthMode: (mode: MonthMode) => void;
  onChangeDayMode: (mode: DayMode) => void;
  onClose: () => void;
};

/**
 * CAL-R4 C-B view customizer — Month Compact|List, Day Single|List.
 * No Stacked or Detail stubs. Agenda remains its own view chip.
 */
export function ViewCustomizeSheet({
  visible,
  monthMode,
  dayMode,
  onChangeMonthMode,
  onChangeDayMode,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const web = Platform.OS === 'web';
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(reduceMotion || web ? 0 : 1);
    Animated.timing(opacity, {
      toValue: 1,
      duration: reduceMotion ? 100 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, web, opacity]);

  return (
    <ScreenOverlay visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Dismiss customizer" />
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.elevated,
            borderColor: colors.line,
            paddingBottom: Math.max(insets.bottom, 16),
            opacity,
          },
        ]}
        accessibilityViewIsModal
        accessibilityLabel="Customize calendar views"
      >
        <Text style={[styles.title, { color: colors.ink }]}>Views</Text>
        <Text style={[styles.section, { color: colors.mute }]}>Month</Text>
        <ChipRow>
          <Chip
            label="Compact"
            selected={monthMode === 'compact'}
            onPress={() => onChangeMonthMode('compact')}
          />
          <Chip
            label="List"
            selected={monthMode === 'list'}
            onPress={() => onChangeMonthMode('list')}
          />
        </ChipRow>
        <Text style={[styles.section, { color: colors.mute }]}>Day</Text>
        <ChipRow>
          <Chip
            label="Single Day"
            selected={dayMode === 'single'}
            onPress={() => onChangeDayMode('single')}
          />
          <Chip
            label="List"
            selected={dayMode === 'list'}
            onPress={() => onChangeDayMode('list')}
          />
        </ChipRow>
        <Text style={[styles.hint, { color: colors.mute }]}>
          Agenda stays on its own chip. Use Year → Month → Day tap-zoom for hierarchy.
        </Text>
        <View style={styles.footer}>
          <GhostButton label="Done" onPress={onClose} />
        </View>
      </Animated.View>
    </ScreenOverlay>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  title: { ...type.title, fontSize: 20 },
  section: {
    ...type.meta,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  hint: { ...type.meta, marginTop: 4 },
  footer: { marginTop: 12, alignItems: 'flex-end' },
});
