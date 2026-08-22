import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AssignmentMark } from '@/components/ui/AssignmentMark';
import { HoverTip } from '@/components/ui/HoverTip';
import { MarqueeText, useMarqueeScroll } from '@/components/ui/MarqueeText';
import { radius, type } from '@/constants/theme';
import { assignmentSubtitle } from '@/lib/assignments/api';
import { useTheme } from '@/lib/theme/ThemeProvider';
import type { AssignmentRow } from '@/lib/supabase/types';

type Props = {
  assignments: AssignmentRow[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate?: () => void;
};

export function AssignmentPicker({ assignments, selectedId, onSelect, onCreate }: Props) {
  const { colors } = useTheme();
  const { scrollHandlers } = useMarqueeScroll();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      {...scrollHandlers}
      contentContainerStyle={styles.row}
    >
      {onCreate ? (
        <HoverTip label="Create a new assignment">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New assignment"
          onPress={onCreate}
          style={({ pressed }) => [styles.cell, pressed && { opacity: 0.88 }]}
        >
          {({ pressed }) => (
            <>
              <View style={[styles.well, { borderColor: colors.line, backgroundColor: colors.elevated }]}>
                <Text style={[styles.plus, { color: colors.brand }]}>+</Text>
              </View>
              <MarqueeText
                text="New"
                align="center"
                paused={pressed}
                fadeColor={colors.bg}
                style={[styles.caption, { color: colors.brand }]}
              />
            </>
          )}
        </Pressable>
        </HoverTip>
      ) : null}
      {assignments.map((row) => {
        const selected = row.id === selectedId;
        return (
          <Pressable
            key={row.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={row.title}
            onPress={() => onSelect(row.id)}
            style={({ pressed }) => [styles.cell, pressed && { opacity: 0.88 }]}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.ring,
                    {
                      borderColor: selected ? colors.brand : 'transparent',
                      backgroundColor: selected ? colors.brandSoft : 'transparent',
                    },
                  ]}
                >
                  <AssignmentMark category={row.category} size={56} />
                </View>
                <MarqueeText
                  text={row.title}
                  align="center"
                  paused={pressed}
                  fadeColor={colors.bg}
                  style={[styles.caption, { color: selected ? colors.brand : colors.ink }]}
                />
                <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={1}>
                  {assignmentSubtitle(row)}
                </Text>
              </>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingVertical: 6,
    paddingRight: 8,
  },
  cell: {
    width: 88,
    alignItems: 'center',
    gap: 4,
  },
  ring: {
    borderWidth: 2,
    borderRadius: radius.md + 4,
    padding: 2,
  },
  well: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: {
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 32,
  },
  caption: {
    ...type.badge,
    fontWeight: '600',
    width: 84,
    textAlign: 'center',
  },
  meta: {
    ...type.badge,
    width: 84,
    textAlign: 'center',
  },
});
