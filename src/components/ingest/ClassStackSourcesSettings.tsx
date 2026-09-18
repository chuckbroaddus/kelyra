/**
 * ST-A / PZ-A — Teach Settings Ingest Folders tab body.
 * Parent/Student never mount this (absent, not grayed). Drive binder wiring is separate.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/constants/theme';
import { INGEST_COPY } from '@/lib/ingest/copy';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  /** After OAuth ?drive=settings — resume folder picker (no second consent). */
  resumeDrivePicker?: boolean;
  onResumeDrivePickerConsumed?: () => void;
};

export function ClassStackSourcesSettings({
  resumeDrivePicker = false,
  onResumeDrivePickerConsumed,
}: Props) {
  const { colors } = useTheme();

  useEffect(() => {
    if (!resumeDrivePicker) return;
    onResumeDrivePickerConsumed?.();
  }, [resumeDrivePicker, onResumeDrivePickerConsumed]);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.mute }]}>
        {INGEST_COPY.classStackSources}
      </Text>
      <Text style={[styles.lead, { color: colors.mute }]}>
        Ingest folder sources for class stacks live here on the Teach seat. Capture stays on the
        header camera — not a tray tab.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionTitle: {
    ...type.section,
    textTransform: 'uppercase',
  },
  lead: {
    ...type.meta,
  },
});
