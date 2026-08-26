import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MarqueeText } from '@/components/ui/MarqueeText';
import { bookRowPad, type BookNode } from '@/lib/assignments/tree';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  row: BookNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAssignmentPress?: () => void;
};

export function GradebookTreeLabel({ row, expanded, onToggle, onAssignmentPress }: Props) {
  const { colors } = useTheme();
  const pad = { paddingLeft: bookRowPad(row) };

  if (row.kind === 'section' && row.inlineUnit && row.unitId) {
    return (
      <View style={[styles.treeCell, pad]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: expanded.has(row.unitId) }}
          accessibilityLabel={`${row.unitTitle ?? row.title}, unit`}
          onPress={() => onToggle(row.unitId!)}
          style={styles.part}
        >
          <Text style={[styles.treeName, { color: colors.ink, fontWeight: '700' }]} numberOfLines={1}>
            {row.unitTitle}
          </Text>
        </Pressable>
        <Text style={[styles.dot, { color: colors.mute }]} accessibilityElementsHidden>
          ·
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: expanded.has(row.id) }}
          accessibilityLabel={`${row.sectionTitle ?? row.title}, section`}
          onPress={() => onToggle(row.id)}
          style={styles.part}
        >
          <Text style={[styles.treeName, { color: colors.ink, fontWeight: '700' }]} numberOfLines={1}>
            {row.sectionTitle}
          </Text>
        </Pressable>
      </View>
    );
  }

  const canOpen = row.expandable || Boolean(onAssignmentPress);
  const marqueeTitle = row.kind === 'class' || row.kind === 'assignment';
  const fade = row.kind === 'assignment' ? colors.card : colors.wash;
  return (
    <Pressable
      accessibilityRole={row.expandable ? 'button' : onAssignmentPress ? 'button' : 'none'}
      accessibilityState={row.expandable ? { expanded: expanded.has(row.id) } : undefined}
      disabled={!canOpen}
      onPress={() => {
        if (row.expandable) onToggle(row.id);
        else onAssignmentPress?.();
      }}
      style={[styles.treeCell, pad]}
    >
      {marqueeTitle ? (
        <MarqueeText
          text={row.title}
          align="start"
          accessible
          accessibilityLabel={row.title}
          fadeColor={fade}
          style={[styles.treeMarquee, { color: colors.ink, fontWeight: row.kind === 'assignment' ? '500' : '700' }]}
        />
      ) : (
        <Text
          style={[styles.treeName, { color: colors.ink, fontWeight: '700' }]}
          numberOfLines={2}
        >
          {row.title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  treeCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    flex: 1,
  },
  part: {
    minWidth: 0,
    flexShrink: 1,
  },
  dot: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    flexShrink: 0,
  },
  treeName: {
    flexShrink: 1,
    minWidth: 8,
    fontSize: 13,
    lineHeight: 16,
  },
  treeMarquee: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 16,
  },
});
