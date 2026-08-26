import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { PersonTabs, type PersonTab } from '@/components/ui/PersonTabs';
import { WorkRow } from '@/components/ui/WorkRow';
import { type } from '@/constants/theme';
import { formatScoreMark } from '@/lib/grade/marks';
import { isFinishedWork, isOpenWork, submissionStatusLabel } from '@/lib/assignments/status';
import { personTabRowUsesTeacherFaces } from '@/components/ui/personTabsLayout';
import { asFeedIcon, DEFAULT_CLASS_FEED_ICON } from '@/lib/feeds/icons';
import { practiceTitle } from '@/lib/practice/api';
import type { StudentClass, StudentTodo } from '@/lib/student-session/api';
import {
  classesFromWork,
  filterStudentWork,
  showStudentStatusIcon,
  studentGradeLine,
  studentStatusIcon,
  studentWorkDateLine,
} from '@/lib/student-session/work';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  items: StudentTodo[];
  classes: StudentClass[];
  pane: 'todo' | 'done' | 'all';
  classId: string | 'all';
  onClassId: (id: string | 'all') => void;
  onOpen: (item: StudentTodo) => void;
  empty: string;
  /** Grades pane: show the mark instead of due / turned-in. */
  grades?: boolean;
  hideClassChips?: boolean;
  classTabsStacked?: boolean;
};

export function StudentWorkList({
  items,
  classes,
  pane,
  classId,
  onClassId,
  onOpen,
  empty,
  grades,
  hideClassChips,
  classTabsStacked,
}: Props) {
  const { colors } = useTheme();
  const rooms = classesFromWork(classes, items);
  const visible = filterStudentWork(items, pane, classId, isOpenWork, isFinishedWork);

  return (
    <View style={styles.wrap}>
      {!hideClassChips && (rooms.length > 1 || classId !== 'all') ? (
        <StudentClassTabs
          classes={rooms}
          value={classId}
          onChange={onClassId}
          all={{ key: 'all', label: 'All', icon: grades ? 'grades' : 'work' }}
          stacked={classTabsStacked}
        />
      ) : null}
      {visible.length === 0 ? (
        <Text style={[styles.empty, { color: colors.mute }]}>{empty}</Text>
      ) : (
        visible.map((item) => {
          const openable = item.kind === 'lesson' || item.kind === 'practice';
          const status = grades
            ? studentGradeLine(item, (mark, score) => formatScoreMark(mark === 'pass' || mark === 'fail' ? mark : 'numeric', score), submissionStatusLabel)
            : studentWorkDateLine(item);
          return (
            <WorkRow
              key={item.submissionId}
              title={practiceTitle(item.title)}
              status={status || undefined}
              lead={
                <Icon name={asFeedIcon(item.classIcon, DEFAULT_CLASS_FEED_ICON)} color={colors.mute} size={28} />
              }
              end={
                showStudentStatusIcon(item.status) ? (
                  <Icon
                    name={studentStatusIcon(item.status)}
                    color={item.status === 'graded' ? colors.good : item.status === 'assigned' ? colors.mute : colors.warn}
                    size={22}
                  />
                ) : undefined
              }
              pills={
                openable
                  ? [
                      {
                        key: 'open',
                        label: 'Open',
                        kind: 'primary',
                        onPress: () => onOpen(item),
                      },
                    ]
                  : undefined
              }
            />
          );
        })
      )}
    </View>
  );
}

export function studentRoomTabs(
  classes: StudentClass[],
  all?: { key: string; label: string; icon: IconName },
): PersonTab[] {
  const tabs: PersonTab[] = all ? [all] : [];
  const teacherFaces = personTabRowUsesTeacherFaces([
    ...(all ? ['other'] : []),
    ...classes.map(() => 'class'),
  ]);
  for (const room of classes) {
    tabs.push({
      key: room.classId,
      label: room.className,
      icon: asFeedIcon(room.feedIcon, DEFAULT_CLASS_FEED_ICON),
      ...(teacherFaces
        ? {
            photoName: room.teacherName || room.className,
            photoUrl: room.teacherPhotoUrl,
          }
        : {}),
    });
  }
  return tabs;
}

export function StudentClassTabs({
  classes,
  value,
  onChange,
  all,
  stacked,
}: {
  classes: StudentClass[];
  value: string;
  onChange: (id: string) => void;
  all?: { key: string; label: string; icon: IconName };
  stacked?: boolean;
}) {
  const tabs = studentRoomTabs(classes, all);
  if (!tabs.length) return null;
  const current = tabs.some((tab) => tab.key === value) ? value : tabs[0]!.key;
  return <PersonTabs tabs={tabs} value={current} onChange={onChange} stacked={stacked} />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 0,
  },
  empty: {
    ...type.body,
    marginTop: 16,
  },
});
