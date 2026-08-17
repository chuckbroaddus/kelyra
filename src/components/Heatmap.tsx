import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { StickyTable } from '@/components/ui/StickyTable';
import { type } from '@/constants/theme';
import type { ReactNode } from 'react';
import { studentHead } from '@/constants/table';
import { firstName } from '@/lib/format';
import type { HeatmapCell } from '@/lib/classes/overview';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  classId: string;
  skills: Array<{ key: string; label: string }>;
  students: Array<{ id: string; displayName: string; photoUrl?: string | null }>;
  marks: Record<string, Record<string, HeatmapCell>>;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export function Heatmap({ classId, skills, students, marks, leading, trailing }: Props) {
  const { colors } = useTheme();
  const layout = useLayout();
  const frozen = layout.breakpoint === 'tablet' ? 168 : layout.breakpoint === 'phone-landscape' ? 148 : 132;
  const size = studentHead.colWidth;
  const rowHeight = layout.breakpoint === 'phone-portrait' ? 44 : 48;
  const headHeight = studentHead.height;
  const legend = (
    <View style={styles.legend}>
      <LegendSwatch fill={colors.brandSoft} stroke={colors.brand} label="Focus" />
      <LegendSwatch fill={colors.goodSoft} stroke={colors.good} label="Approved gap" />
      <LegendSwatch fill={colors.wash} stroke={colors.line} label="None" />
    </View>
  );

  return (
    <View style={styles.wrap}>
      <StickyTable<(typeof skills)[number]>
        leading={
          <>
            {leading}
            {legend}
          </>
        }
        trailing={trailing}
        rows={skills}
        rowKey={(skill) => skill.key}
        frozenTitle="Gap"
        frozenWidth={frozen}
        rowHeight={rowHeight}
        headHeight={headHeight}
        titleLines={2}
        empty="Approve a gap to see who else has it."
        renderFrozen={(skill) => (
          <Text style={[styles.name, { color: colors.ink }]} numberOfLines={2}>
            {skill.label}
          </Text>
        )}
        columns={students.map((student) => ({
          key: student.id,
          title: firstName(student.displayName),
          width: size,
          renderTitle: () => (
            <Link
              href={`/class/${classId}/student/${student.id}`}
              accessibilityLabel={firstName(student.displayName)}
            >
              <View style={styles.headPerson}>
                <Avatar name={student.displayName} photoUrl={student.photoUrl} size={studentHead.avatar} />
                <MarqueeText
                  text={firstName(student.displayName)}
                  align="center"
                  fadeColor={colors.wash}
                  style={[styles.headName, { color: colors.ink }]}
                />
              </View>
            </Link>
          ),
          render: (skill) => {
            const mark = marks[student.id]?.[skill.key] ?? null;
            return (
              <View
                style={[
                  styles.mark,
                  { backgroundColor: colors.wash },
                  mark === 'focus' && { backgroundColor: colors.brandSoft, borderWidth: 1, borderColor: colors.brand },
                  mark === 'gap' && { backgroundColor: colors.goodSoft },
                ]}
              />
            );
          },
        }))}
      />
    </View>
  );
}

function LegendSwatch({ fill, stroke, label }: { fill: string; stroke: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: fill, borderColor: stroke }]} />
      <Text style={[type.meta, { color: colors.mute }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
  },
  headPerson: {
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  headName: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  mark: {
    width: '100%',
    height: '70%',
    borderRadius: 3,
  },
});
