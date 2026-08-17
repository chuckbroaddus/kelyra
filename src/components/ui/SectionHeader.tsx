import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  label: string;
  first?: boolean;
  right?: ReactNode;
};

export function SectionHeader({ label, first, right }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, first && styles.first, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.mute }]} numberOfLines={1}>
        {label}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 24,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    zIndex: 4,
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
      },
      default: {},
    }),
  },
  first: {
    marginTop: 0,
  },
  label: {
    ...type.section,
    flexShrink: 1,
    textTransform: 'uppercase',
  },
});
