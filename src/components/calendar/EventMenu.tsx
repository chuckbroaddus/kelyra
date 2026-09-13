import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton } from '@/components/ui/Button';
import { ScreenOverlay } from '@/components/ui/ScreenOverlay';
import { radius, type } from '@/constants/theme';
import { eventMenuActions } from '@/lib/calendar/eventActions';
import type { CalendarItem, CalendarSeat } from '@/lib/calendar/types';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  visible: boolean;
  seat: CalendarSeat;
  item: CalendarItem | null;
  onClose: () => void;
  onView: (item: CalendarItem) => void;
  onEdit: (item: CalendarItem) => void;
  onDelete: (item: CalendarItem) => void;
  onOpenAssignment: (item: CalendarItem) => void;
};

/** MG-A event ⋯ menu. Assignment = Open assignment. School Delete disabled + reason. */
export function EventMenu({
  visible,
  seat,
  item,
  onClose,
  onView,
  onEdit,
  onDelete,
  onOpenAssignment,
}: Props) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  if (!item) return null;
  const actions = eventMenuActions(seat, item);

  return (
    <ScreenOverlay visible={visible} onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          web && styles.center,
          { backgroundColor: scheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(26,22,18,0.40)' },
        ]}
      >
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close menu" />
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
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: colors.mute }]}>
            {item.category}
            {item.visibility ? ` · ${item.visibility}` : ''}
          </Text>
          {actions.map((action) => (
            <View key={action.key} style={styles.actionBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: Boolean(action.disabled) }}
                accessibilityLabel={
                  action.disabled && action.reason
                    ? `${action.label}. ${action.reason}`
                    : action.label
                }
                disabled={action.disabled}
                onPress={() => {
                  if (action.disabled) return;
                  if (action.key === 'open-assignment') onOpenAssignment(item);
                  else if (action.key === 'edit') onEdit(item);
                  else if (action.key === 'delete') onDelete(item);
                  else onView(item);
                }}
                style={[
                  styles.row,
                  {
                    borderColor: colors.line,
                    backgroundColor: colors.wash,
                    minHeight: 44,
                    opacity: action.disabled ? 0.55 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    { color: action.danger && !action.disabled ? colors.danger : colors.ink },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
              {action.disabled && action.reason ? (
                <Text style={[styles.reason, { color: colors.mute }]}>{action.reason}</Text>
              ) : null}
            </View>
          ))}
          <GhostButton label="Close" onPress={onClose} />
        </View>
      </View>
    </ScreenOverlay>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { flex: 1, minHeight: 48 },
  center: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 400, borderWidth: 1, padding: 16, gap: 10 },
  card: { borderRadius: radius.lg, alignSelf: 'center' },
  bottom: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxWidth: '100%',
  },
  title: type.rowTitle,
  meta: type.meta,
  actionBlock: { gap: 4 },
  row: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  rowLabel: { ...type.body, fontWeight: '600' },
  reason: type.meta,
});
