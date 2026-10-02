/**
 * Inline "?" affordance + popover for bundled help topics.
 * Matches the Syllabus step-heading help standard (small circle, expands in place).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { type } from '@/constants/theme';
import { getBundledHelpTopic, type HelpTopic } from '@/lib/help/helpTopics';

export type TopicHelpColors = {
  ink: string;
  mute: string;
  line: string;
  elevated?: string;
};

export function useTopicHelp(topicKey: string, resetKey?: string | number | boolean | null) {
  const [open, setOpen] = useState(false);
  const help = getBundledHelpTopic(topicKey);

  useEffect(() => {
    setOpen(false);
  }, [topicKey, resetKey]);

  return {
    open,
    setOpen,
    help,
    toggle: () => setOpen((v) => !v),
  };
}

export function TopicHelpHit({
  open,
  label,
  colors,
  onPress,
}: {
  open: boolean;
  label: string;
  colors: TopicHelpColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Help for ${label}`}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={({ pressed }) => [styles.helpHit, { borderColor: colors.line, opacity: pressed ? 0.75 : 1 }]}
    >
      <Text style={[styles.helpGlyph, { color: colors.mute }]}>?</Text>
    </Pressable>
  );
}

export function TopicHelpPop({ help, colors }: { help: HelpTopic; colors: TopicHelpColors }) {
  const elevated = colors.elevated ?? `${colors.line}33`;
  return (
    <View style={[styles.helpPop, { backgroundColor: elevated, borderColor: colors.line }]}>
      <Text style={[type.body, { color: colors.ink, fontWeight: '700' }]}>{help.title}</Text>
      <Text style={[type.meta, { color: colors.mute, marginTop: 4 }]}>{help.meaning}</Text>
      {help.example ? (
        <Text style={[type.meta, { color: colors.ink, marginTop: 6 }]}>Example: {help.example}</Text>
      ) : null}
    </View>
  );
}

/**
 * Section label + "?" hit. Popover renders full-width under the row (not in the flex end slot).
 */
export function TopicHelpLabel({
  title,
  topicKey,
  colors,
  resetKey,
  style,
  titleStyle,
  marginTop = 12,
}: {
  title: string;
  topicKey: string;
  colors: TopicHelpColors;
  resetKey?: string | number | boolean | null;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  marginTop?: number;
}) {
  const { open, toggle, help } = useTopicHelp(topicKey, resetKey);
  if (!help) {
    return (
      <Text style={[type.meta, { color: colors.mute, fontWeight: '600', marginTop }, titleStyle]}>{title}</Text>
    );
  }
  return (
    <View style={[{ marginTop, marginBottom: 4 }, style]}>
      <View style={styles.titleRow}>
        <Text style={[type.meta, { color: colors.mute, fontWeight: '600', flex: 1 }, titleStyle]}>{title}</Text>
        <TopicHelpHit open={open} label={title} colors={colors} onPress={toggle} />
      </View>
      {open ? <TopicHelpPop help={help} colors={colors} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helpHit: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpGlyph: { fontSize: 13, fontWeight: '700', lineHeight: 16 },
  helpPop: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 4,
  },
});
