import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { type } from '@/constants/theme';
import { asSubmissionStatus, gradebookStatusIcon, submissionStatusLabel } from '@/lib/assignments/status';
import { cellTone, formatCell, type GradeCell } from '@/lib/gradebook/api';
import { useTheme } from '@/lib/theme/ThemeProvider';

export const GradebookCellMark = memo(function GradebookCellMark({ cell }: { cell: GradeCell }) {
  const { colors } = useTheme();
  const icon = gradebookStatusIcon(cell.status);
  if (icon) {
    const color = asSubmissionStatus(cell.status) === 'assigned' ? colors.mute : colors.warn;
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={submissionStatusLabel(cell.status) || 'Assigned'}
        style={styles.icon}
      >
        <Icon name={icon} color={color} size={22} />
      </View>
    );
  }
  const tone = cellTone(cell);
  const color =
    tone === 'mute' ? colors.mute : tone === 'good' ? colors.good : tone === 'warn' ? colors.warn : colors.ink;
  return (
    <Text style={[styles.mark, { color, fontWeight: '600' }]} numberOfLines={1}>
      {formatCell(cell)}
    </Text>
  );
});

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 22,
  },
  mark: {
    ...type.cell,
    textAlign: 'center',
  },
});
