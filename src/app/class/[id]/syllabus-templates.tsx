/**
 * School syllabus template picker — single-select cards, Cancel / Select.
 * Select hands the key back to the Syllabus screen via templateHandoff.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { radius, type } from '@/constants/theme';
import { usePushedTitle } from '@/lib/chrome/ChromeProvider';
import { describeSchoolSyllabusTemplate } from '@/lib/syllabus/templateDescribe';
import { putSyllabusTemplateHandoff } from '@/lib/syllabus/templateHandoff';
import { listSchoolSyllabusTemplates } from '@/lib/syllabus/templates';
import { useTheme } from '@/lib/theme/ThemeProvider';

export default function SyllabusTemplatesScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  usePushedTitle('School templates');

  const templates = useMemo(() => listSchoolSyllabusTemplates(), []);
  const [selected, setSelected] = useState<string | null>(null);

  const onCancel = () => {
    router.back();
  };

  const onSelect = () => {
    if (!id || !selected) return;
    putSyllabusTemplateHandoff(id, selected);
    router.back();
  };

  return (
    <Screen
      keyboard
      pageChromeHosted
      sticky={
        <View style={styles.footer}>
          <View style={styles.footerBtn}>
            <GhostButton label="Cancel" fullWidth onPress={onCancel} />
          </View>
          <View style={styles.footerBtn}>
            <PrimaryButton
              label="Select"
              fullWidth
              disabled={!selected}
              onPress={onSelect}
            />
          </View>
        </View>
      }
    >
      <Text style={[type.body, { color: colors.ink, marginBottom: 4 }]}>
        Choose a school template
      </Text>
      <Text style={[type.meta, { color: colors.mute, marginBottom: 12 }]}>
        Copies the settings you’re allowed to change. Settings your school controls stay as they are.
      </Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="School syllabus templates" style={styles.group}>
        {templates.map((t) => {
          const isOn = selected === t.key;
          const explanation = describeSchoolSyllabusTemplate(t);
          return (
            <Pressable
              key={t.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: isOn, checked: isOn }}
              accessibilityLabel={t.name}
              onPress={() => setSelected(t.key)}
              style={({ pressed }) => [
                styles.card,
                {
                  borderColor: isOn ? colors.brand : colors.line,
                  backgroundColor: colors.elevated,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.cardHead}>
                <View
                  style={[
                    styles.radio,
                    { borderColor: isOn ? colors.brand : colors.mute },
                  ]}
                >
                  {isOn ? <View style={[styles.radioDot, { backgroundColor: colors.brand }]} /> : null}
                </View>
                <Text style={[type.rowTitle, { color: colors.ink, flex: 1 }]}>{t.name}</Text>
              </View>
              <Text style={[type.meta, styles.explain, { color: colors.mute }]}>{explanation}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  explain: {
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  footerBtn: {
    flex: 1,
    minWidth: 0,
  },
});
