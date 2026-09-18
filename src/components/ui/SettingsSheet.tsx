import { useEffect, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClassStackSourcesSettings } from '@/components/ingest/ClassStackSourcesSettings';
import { AppearanceControl } from '@/components/ui/AppearanceControl';
import { GhostButton } from '@/components/ui/Button';
import { HoverTip } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { radius, type } from '@/constants/theme';
import {
  DIARY_FERPA_NOTE,
  DIARY_PRIVACY_BODY,
  DIARY_PRIVACY_TITLE,
} from '@/lib/diary/privacy';
import { useTheme } from '@/lib/theme/ThemeProvider';

type SettingsTabKey = 'theme' | 'ingest' | 'diary';

type SettingsTab = {
  key: SettingsTabKey;
  label: string;
  icon: IconName;
  accessibilityLabel: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Teach seat only — Parent/Student get zero Ingest Folders (PZ-A absent). */
  teachSeat?: boolean;
  /** After OAuth ?drive=settings — resume Drive folder picker. */
  resumeDrivePicker?: boolean;
  onResumeDrivePickerConsumed?: () => void;
  /** Open Diary ghost — teacher / parent / office only (DIARY L7: never student). */
  allowOpenDiary?: boolean;
  onOpenDiary?: () => void;
};

export function SettingsSheet({
  visible,
  onClose,
  teachSeat = false,
  resumeDrivePicker = false,
  onResumeDrivePickerConsumed,
  allowOpenDiary = false,
  onOpenDiary,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const tabs = useMemo<SettingsTab[]>(
    () =>
      teachSeat
        ? [
            { key: 'theme', label: 'Theme', icon: 'theme', accessibilityLabel: 'Theme' },
            {
              key: 'ingest',
              label: 'Ingest Folders',
              icon: 'ingestFolders',
              accessibilityLabel: 'Ingest Folders',
            },
            { key: 'diary', label: 'Diary', icon: 'diary', accessibilityLabel: 'Diary' },
          ]
        : [
            { key: 'theme', label: 'Theme', icon: 'theme', accessibilityLabel: 'Theme' },
            { key: 'diary', label: 'Diary', icon: 'diary', accessibilityLabel: 'Diary' },
          ],
    [teachSeat],
  );
  const [tab, setTab] = useState<SettingsTabKey>('theme');

  useEffect(() => {
    if (!visible) return;
    if (resumeDrivePicker && teachSeat) {
      setTab('ingest');
      return;
    }
    setTab('theme');
  }, [visible, resumeDrivePicker, teachSeat]);

  useEffect(() => {
    if (tab === 'ingest' && !teachSeat) setTab('theme');
  }, [tab, teachSeat]);

  const active = tabs.some((item) => item.key === tab) ? tab : 'theme';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close settings" />
        <View
          pointerEvents="auto"
          style={[
            styles.card,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.line,
              marginBottom: web ? 0 : insets.bottom,
              maxHeight: web ? '90%' : undefined,
            },
          ]}
        >
          <View style={styles.head}>
            <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>
            <HoverTip label="Close">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                onPress={onClose}
                style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
              >
                <Icon name="close" color={colors.ink} size={20} />
              </Pressable>
            </HoverTip>
          </View>
          <View
            accessibilityRole="tablist"
            style={[styles.tabRow, { borderBottomColor: colors.line }]}
          >
            {tabs.map((item) => {
              const selected = item.key === active;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={item.accessibilityLabel}
                  onPress={() => setTab(item.key)}
                  style={({ pressed }) => [
                    styles.tab,
                    selected && { borderBottomColor: colors.brand },
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <Icon name={item.icon} color={selected ? colors.brand : colors.mute} size={18} />
                  <Text
                    style={[styles.tabLabel, { color: selected ? colors.brand : colors.mute }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {active === 'theme' ? <AppearanceControl /> : null}
            {/* ST-07 / PZ-A: Teach-only Ingest Folders — absent (not grayed) off teach. */}
            {teachSeat && active === 'ingest' ? (
              <ClassStackSourcesSettings
                resumeDrivePicker={resumeDrivePicker}
                onResumeDrivePickerConsumed={onResumeDrivePickerConsumed}
              />
            ) : null}
            {active === 'diary' ? (
              <>
                <Text style={[styles.diaryTitle, { color: colors.ink }]}>{DIARY_PRIVACY_TITLE}</Text>
                <Text style={[styles.diaryBody, { color: colors.mute }]}>{DIARY_PRIVACY_BODY}</Text>
                <Text style={[styles.diaryBody, { color: colors.mute }]}>{DIARY_FERPA_NOTE}</Text>
                {allowOpenDiary && onOpenDiary ? (
                  <GhostButton label="Open Diary" onPress={onOpenDiary} />
                ) : null}
              </>
            ) : null}
          </ScrollView>
          <GhostButton label="Done" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    gap: 14,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 4,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    ...type.title,
    flex: 1,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    ...type.badge,
    fontWeight: '600',
    textAlign: 'center',
  },
  diaryTitle: {
    ...type.body,
    fontWeight: '600',
  },
  diaryBody: {
    ...type.meta,
  },
});
