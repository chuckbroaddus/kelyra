import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { type } from '@/constants/theme';
import { MULTIDAY_COUNTS, type MultidayCount } from '@/lib/calendar/multiday';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  value: MultidayCount;
  onChange: (count: MultidayCount) => void;
};

/**
 * CAL-29 / M-MULTIDAY-STEPPER — essential 3 / 5 / 7 control.
 * Always available; pinch never sole path (RM-safe).
 */
export function MultiDayStepper({ value, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityLabel={`Day columns, ${value}`}
      accessibilityValue={{ now: value, min: 3, max: 7, text: `${value} days` }}
    >
      <Text style={[styles.label, { color: colors.mute }]}>Days</Text>
      <ChipRow compact>
        {MULTIDAY_COUNTS.map((n) => (
          <Chip
            key={n}
            label={`${n}`}
            selected={value === n}
            onPress={() => onChange(n)}
          />
        ))}
      </ChipRow>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginBottom: 4 },
  label: { ...type.meta, textTransform: 'uppercase' },
});
