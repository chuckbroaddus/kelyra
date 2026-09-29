import {
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { GhostButton } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { hitSlop, radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type PhotoSheetTeacherImage = {
  id: string;
  displayName: string;
  photoUrl: string | null;
  photoAssetId: string;
  /** Class holds a snapshot from this teacher (and they still have a photo). */
  usingThisImage?: boolean;
  /** Snapshot source still this teacher, but their current face differs. */
  keptEarlier?: boolean;
};

type Props = {
  visible: boolean;
  title?: string;
  hasPhoto?: boolean;
  showUseHomework?: boolean;
  onTake: () => void;
  onLibrary: () => void;
  onUseHomework?: () => void;
  onRemove?: () => void;
  /** Optional third source (Journal attach): any file. */
  onFile?: () => void;
  /** Office Class avatar sheet only (AC-CATI). Absent/empty → no teacher-image block. */
  teacherImages?: PhotoSheetTeacherImage[];
  onTeacherImage?: (teacherId: string) => void;
  onCancel: () => void;
};

function afterDismiss(run: () => void) {
  if (Platform.OS === 'web') {
    run();
    return;
  }
  InteractionManager.runAfterInteractions(() => {
    setTimeout(run, Platform.OS === 'ios' ? 450 : 250);
  });
}

export function PhotoSheet({
  visible,
  title = 'Photo',
  hasPhoto,
  showUseHomework,
  onTake,
  onLibrary,
  onUseHomework,
  onRemove,
  onFile,
  teacherImages,
  onTeacherImage,
  onCancel,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const teachers = teacherImages?.filter((row) => Boolean(row.id)) ?? [];
  const showTeacherBlock = teachers.length > 0;

  const run = (action: () => void, waitForPicker = false) => {
    // Web: fire the picker in this click before unmounting the sheet, or the
    // file dialog never opens. Native: dismiss first, then wait, then pick.
    if (waitForPicker && web) {
      action();
      return;
    }
    onCancel();
    if (waitForPicker) afterDismiss(action);
    else action();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={[
          styles.root,
          web && styles.center,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel="Cancel" />
        <View
          pointerEvents="auto"
          style={[
            styles.sheet,
            web ? styles.card : styles.bottom,
            {
              backgroundColor: colors.elevated,
              borderColor: colors.line,
              paddingBottom: web ? 16 : 16 + insets.bottom,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.ink }]}>{title}</Text>
          <Row icon="capture" label="Take photo" onPress={() => run(onTake, true)} color={colors.ink} />
          <Row label="Choose from library" onPress={() => run(onLibrary, true)} color={colors.ink} />
          {onFile ? (
            <Row icon="file" label="Choose a file" onPress={() => run(onFile, true)} color={colors.ink} />
          ) : null}
          {showUseHomework ? (
            <Row
              label="Use this homework as profile"
              onPress={() => run(() => onUseHomework?.())}
              color={colors.ink}
            />
          ) : null}
          {showTeacherBlock ? (
            <>
              <Text
                accessibilityRole="header"
                style={[styles.teacherHeader, { color: colors.ink }]}
              >
                Use the Teacher's Avatar Image
              </Text>
              {teachers.map((teacher) => {
                const matchOnly = Boolean(teacher.usingThisImage && !teacher.keptEarlier);
                return (
                  <View key={teacher.id}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        teacher.usingThisImage
                          ? teacher.keptEarlier
                            ? `${teacher.displayName}. Using this image. Class kept the earlier photo.`
                            : `${teacher.displayName}. Using this image`
                          : teacher.displayName
                      }
                      hitSlop={hitSlop}
                      onPress={() => {
                        if (matchOnly) return;
                        run(() => onTeacherImage?.(teacher.id));
                      }}
                      style={({ pressed }) => [styles.teacherRow, pressed && !matchOnly && { opacity: 0.7 }]}
                    >
                      <Avatar
                        name={teacher.displayName}
                        photoUrl={teacher.photoUrl}
                        hasPhoto
                        size={32}
                      />
                      <Text style={[styles.teacherName, { color: colors.ink }]} numberOfLines={2}>
                        {teacher.displayName}
                      </Text>
                      {teacher.usingThisImage ? (
                        <Text style={[styles.usingMark, { color: colors.brand }]}>Using this image</Text>
                      ) : null}
                    </Pressable>
                    {teacher.usingThisImage && teacher.keptEarlier ? (
                      <Text style={[styles.keptLine, { color: colors.mute }]}>
                        Class kept the earlier photo.
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </>
          ) : null}
          {hasPhoto ? (
            <Row label="Remove photo" onPress={() => run(() => onRemove?.())} color={colors.danger} />
          ) : null}
          <GhostButton label="Cancel" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label,
  onPress,
  color,
  icon,
}: {
  label: string;
  onPress: () => void;
  color: string;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      {icon ? <Icon name={icon} color={color} size={20} /> : null}
      <Text style={[styles.rowLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrim: {
    flex: 1,
    minHeight: 48,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  card: {
    borderRadius: radius.lg,
    alignSelf: 'center',
  },
  bottom: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxWidth: '100%',
  },
  title: {
    ...type.section,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowLabel: type.body,
  teacherHeader: {
    ...type.rowTitle,
    paddingTop: 8,
    paddingBottom: 2,
    // Exact CEO label — never uppercase / ellipsize (AC-CATI-1).
  },
  teacherRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teacherName: {
    ...type.body,
    flex: 1,
    flexShrink: 1,
  },
  usingMark: {
    ...type.meta,
    fontWeight: '600',
    flexShrink: 0,
    marginLeft: 8,
  },
  keptLine: {
    ...type.meta,
    marginLeft: 42,
    marginBottom: 4,
  },
});
