import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type DetailsItem = {
  key: string;
  label: string;
  value: string | null;
};

type Props = {
  rows: DetailsItem[];
  onPress: (row: DetailsItem) => void;
  onClear?: (row: DetailsItem) => void;
};

export function DetailsRows({ rows, onPress, onClear }: Props) {
  const { colors } = useTheme();
  return (
    <View>
      {rows.map((row) => {
        const empty = !row.value?.trim();
        return (
          <View key={row.key} style={[styles.row, { borderBottomColor: colors.line }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onPress(row)}
              style={({ pressed }) => [styles.main, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.label, { color: colors.mute }]}>{row.label}</Text>
              <Text
                style={[styles.value, { color: empty ? colors.mute : colors.ink }]}
                numberOfLines={3}
              >
                {empty ? `Add ${row.label.toLowerCase()}` : row.value}
              </Text>
            </Pressable>
            {!empty && onClear ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Clear ${row.label}`}
                onPress={() => onClear(row)}
                style={({ pressed }) => [styles.clear, pressed && { opacity: 0.7 }]}
              >
                <Text style={[styles.clearLabel, { color: colors.mute }]}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  label: {
    ...type.meta,
    width: 128,
    flexShrink: 0,
    paddingTop: 2,
  },
  value: {
    ...type.body,
    flex: 1,
    minWidth: 0,
  },
  clear: {
    minHeight: 32,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  clearLabel: type.meta,
});
