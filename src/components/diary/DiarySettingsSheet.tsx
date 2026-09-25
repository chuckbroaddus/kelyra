import { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { TextField } from '@/components/ui/TextField';
import { type } from '@/constants/theme';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { useReducedMotion } from '@/lib/ui/reducedMotion';

export type DiaryChip = { id: string; name: string };

export const DIARY_LEDGER_FAMILIES: Array<{ key: string | null; label: string }> = [
  { key: null, label: 'All' },
  { key: 'assign', label: 'Assign' },
  { key: 'grade', label: 'Grade' },
  { key: 'syllabus', label: 'Syllabus' },
  { key: 'capture', label: 'Capture' },
  { key: 'office', label: 'Office' },
  { key: 'other', label: 'Other' },
];

type Props = {
  visible: boolean;
  /** Done (bottom): parent applies filters (replaces the old ledger Apply tap). */
  onDone: () => void;
  /** Cancel (top) / backdrop / back: parent restores the settings from when the sheet opened. */
  onCancel: () => void;
  // Common
  sortOldest: boolean;
  onChangeSortOldest: (oldest: boolean) => void;
  /** Parent seat with 2+ linked children. */
  childOptions: DiaryChip[];
  focusedChildId: string | null;
  onChangeChild: (id: string) => void;
  // Journal
  journalTag: string;
  onChangeJournalTag: (tag: string) => void;
  /** Teacher / staff: soft student pointer filter. */
  showStudentPointer: boolean;
  taughtClasses: DiaryChip[];
  journalClassId: string | null;
  journalStudentId: string | null;
  journalRoster: DiaryChip[];
  onChangeJournalClass: (id: string | null) => void;
  onChangeJournalStudent: (id: string | null) => void;
  // Ledger (hidden for parent seat — My Ledger deferred)
  showLedger: boolean;
  family: string | null;
  onChangeFamily: (key: string | null) => void;
  ledgerFrom: string;
  ledgerTo: string;
  onChangeLedgerFrom: (v: string) => void;
  onChangeLedgerTo: (v: string) => void;
  ledgerClassId: string | null;
  ledgerStudentId: string | null;
  ledgerRoster: DiaryChip[];
  onChangeLedgerClass: (id: string | null) => void;
  onChangeLedgerStudent: (id: string | null) => void;
  onExportCsv: () => void;
  onCopyCsv: () => void;
};

/**
 * DIARY-GEAR: Diary settings — Common / Journal / Ledger sections (CEO 2026-09-24).
 * Sort, Tag, Student pointer, Ledger filters and CSV live here.
 * Cancel (top) discards changes; Done (bottom) applies them.
 */
export function DiarySettingsSheet(props: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const web = Platform.OS === 'web';
  const opacity = useRef(new Animated.Value(1)).current;
  const { visible, onDone, onCancel } = props;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(reduceMotion || web ? 0 : 1);
    Animated.timing(opacity, {
      toValue: 1,
      duration: reduceMotion ? 100 : 180,
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, web, opacity]);

  const heading = (label: string) => (
    <Text style={[styles.heading, { color: colors.ink }]} accessibilityRole="header">
      {label}
    </Text>
  );
  const label = (text: string) => (
    <Text style={[styles.section, { color: colors.mute }]}>{text}</Text>
  );

  return (
    <ScreenOverlay visible={visible} onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancel settings" />
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
        accessibilityLabel="Diary settings"
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.ink }]}>Settings</Text>
          <GhostButton label="Cancel" onPress={onCancel} />
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {heading('Common')}
          {label('Sort')}
          <ChipRow>
            <Chip
              label="Newest"
              selected={!props.sortOldest}
              onPress={() => props.onChangeSortOldest(false)}
            />
            <Chip
              label="Oldest"
              selected={props.sortOldest}
              onPress={() => props.onChangeSortOldest(true)}
            />
          </ChipRow>
          {props.childOptions.length >= 2 ? (
            <>
              {label('Child')}
              <ChipRow>
                {props.childOptions.map((child) => (
                  <Chip
                    key={child.id}
                    label={firstName(child.name)}
                    selected={props.focusedChildId === child.id}
                    onPress={() => props.onChangeChild(child.id)}
                  />
                ))}
              </ChipRow>
            </>
          ) : null}

          {heading('Journal')}
          <TextField
            label="Tag"
            value={props.journalTag}
            onChangeText={props.onChangeJournalTag}
            placeholder="Exact tag"
            autoCapitalize="none"
          />
          {props.showStudentPointer ? (
            <>
              {label('Student pointer (private search only)')}
              {props.taughtClasses.length ? (
                <ChipRow>
                  <Chip
                    label="All students"
                    selected={props.journalClassId == null && props.journalStudentId == null}
                    onPress={() => {
                      props.onChangeJournalClass(null);
                      props.onChangeJournalStudent(null);
                    }}
                  />
                  {props.taughtClasses.map((klass) => (
                    <Chip
                      key={klass.id}
                      label={klass.name}
                      selected={props.journalClassId === klass.id}
                      onPress={() => {
                        props.onChangeJournalClass(klass.id);
                        props.onChangeJournalStudent(null);
                      }}
                    />
                  ))}
                </ChipRow>
              ) : (
                <Text style={[type.meta, { color: colors.mute }]}>
                  Soft student filter needs a taught class roster.
                </Text>
              )}
              {props.journalClassId ? (
                <ChipRow>
                  {props.journalRoster.map((student) => (
                    <Chip
                      key={student.id}
                      label={firstName(student.name)}
                      selected={props.journalStudentId === student.id}
                      onPress={() =>
                        props.onChangeJournalStudent(
                          props.journalStudentId === student.id ? null : student.id,
                        )
                      }
                    />
                  ))}
                </ChipRow>
              ) : null}
            </>
          ) : null}

          {props.showLedger ? (
            <>
              {heading('Ledger')}
              {label('Action')}
              <ChipRow>
                {DIARY_LEDGER_FAMILIES.map((item) => (
                  <Chip
                    key={item.label}
                    label={item.label}
                    selected={props.family === item.key}
                    onPress={() => props.onChangeFamily(item.key)}
                  />
                ))}
              </ChipRow>
              <TextField
                label="From date (YYYY-MM-DD)"
                value={props.ledgerFrom}
                onChangeText={props.onChangeLedgerFrom}
                autoCapitalize="none"
              />
              <TextField
                label="To date (YYYY-MM-DD)"
                value={props.ledgerTo}
                onChangeText={props.onChangeLedgerTo}
                autoCapitalize="none"
              />
              {label('Class (taught)')}
              {props.taughtClasses.length ? (
                <ChipRow>
                  <Chip
                    label="All classes"
                    selected={props.ledgerClassId == null}
                    onPress={() => {
                      props.onChangeLedgerClass(null);
                      props.onChangeLedgerStudent(null);
                    }}
                  />
                  {props.taughtClasses.map((klass) => (
                    <Chip
                      key={klass.id}
                      label={klass.name}
                      selected={props.ledgerClassId === klass.id}
                      onPress={() => {
                        props.onChangeLedgerClass(klass.id);
                        props.onChangeLedgerStudent(null);
                      }}
                    />
                  ))}
                </ChipRow>
              ) : (
                <Text style={[type.meta, { color: colors.mute }]}>
                  No taught classes on this seat — class filter unavailable.
                </Text>
              )}
              {props.ledgerClassId ? (
                <>
                  {label('Student (roster)')}
                  <ChipRow>
                    <Chip
                      label="All students"
                      selected={props.ledgerStudentId == null}
                      onPress={() => props.onChangeLedgerStudent(null)}
                    />
                    {props.ledgerRoster.map((student) => (
                      <Chip
                        key={student.id}
                        label={firstName(student.name)}
                        selected={props.ledgerStudentId === student.id}
                        onPress={() => props.onChangeLedgerStudent(student.id)}
                      />
                    ))}
                  </ChipRow>
                </>
              ) : null}
              {label('CSV')}
              <ChipRow>
                <Chip label="Export CSV" selected={false} onPress={props.onExportCsv} />
                <Chip label="Copy CSV" selected={false} onPress={props.onCopyCsv} />
              </ChipRow>
            </>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { borderTopColor: colors.line }]}>
          <PrimaryButton label="Done" onPress={onDone} />
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
    maxHeight: '85%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { ...type.title, fontSize: 20 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  scrollContent: { gap: 10, paddingBottom: 8 },
  heading: { ...type.title, fontSize: 17, marginTop: 12 },
  section: {
    ...type.meta,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
