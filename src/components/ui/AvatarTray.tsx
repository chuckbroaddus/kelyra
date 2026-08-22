import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HoverTip, tipIfNew } from '@/components/ui/HoverTip';
import { MarqueeText, useMarqueeScroll } from '@/components/ui/MarqueeText';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { type } from '@/constants/theme';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type TrayPerson = {
  id: string;
  name: string;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  /** Overrides the first-name caption (group chats use @handle). */
  caption?: string;
};

type Props = {
  people: TrayPerson[];
  selectedId?: string | null;
  onPress?: (person: TrayPerson) => void;
  /**
   * Trailing empty-seat cell. Only for pickers where unassigned is valid
   * (proposal homework). Never on navigation trays.
   */
  allowUnknown?: boolean;
  onUnknown?: () => void;
  addLabel?: string;
  onAdd?: () => void;
};

export function AvatarTray({
  people,
  selectedId,
  onPress,
  allowUnknown,
  onUnknown,
  addLabel,
  onAdd,
}: Props) {
  const { colors } = useTheme();
  const { scrollHandlers } = useMarqueeScroll();
  if (!people.length && !allowUnknown && !onAdd) return null;
  const unknownOn = Boolean(allowUnknown) && !selectedId;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      {...scrollHandlers}
      contentContainerStyle={styles.row}
    >
      {people.map((person) => {
        const selected = person.id === selectedId;
        return (
          <HoverTip key={person.id} label={tipIfNew(person.caption || firstName(person.name), person.name)}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={person.caption || firstName(person.name)}
            disabled={!onPress}
            onPress={() => onPress?.(person)}
            style={({ pressed }) => [styles.cell, Platform.OS === 'web' && styles.clickable, pressed && { opacity: 0.88 }]}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.ring,
                    {
                      borderColor: selected ? colors.brand : 'transparent',
                      backgroundColor: selected ? colors.brandSoft : 'transparent',
                    },
                  ]}
                >
                  <Avatar name={person.name} photoUrl={person.photoUrl} hasPhoto={person.hasPhoto} size={56} />
                </View>
                <MarqueeText
                  text={person.caption || firstName(person.name)}
                  align="center"
                  paused={pressed}
                  fadeColor={colors.bg}
                  style={[styles.caption, { color: selected ? colors.brand : colors.ink }]}
                />
              </>
            )}
          </Pressable>
          </HoverTip>
        );
      })}
      {allowUnknown ? (
        <>
          <View style={[styles.rule, { backgroundColor: colors.line }]} />
          <HoverTip label="Unknown. Clears the student. Work waits in Inbox.">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: unknownOn }}
            accessibilityLabel="Unknown. Clears the student. Work waits in Inbox."
            onPress={() => onUnknown?.()}
            style={({ pressed }) => [styles.cell, pressed && { opacity: 0.88 }]}
          >
            {({ pressed }) => (
              <>
                <View
                  style={[
                    styles.ring,
                    {
                      borderColor: unknownOn ? colors.brand : 'transparent',
                      backgroundColor: unknownOn ? colors.brandSoft : 'transparent',
                    },
                  ]}
                >
                  <UnknownMark size={56} />
                </View>
                <MarqueeText
                  text="Unknown"
                  align="center"
                  paused={pressed}
                  fadeColor={colors.bg}
                  style={[styles.caption, { color: unknownOn ? colors.brand : colors.mute }]}
                />
              </>
            )}
          </Pressable>
          </HoverTip>
        </>
      ) : null}
      {onAdd ? (
        <HoverTip label={addLabel || 'Add people'}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={addLabel || 'Add people'}
            onPress={onAdd}
            style={({ pressed }) => [styles.cell, Platform.OS === 'web' && styles.clickable, pressed && { opacity: 0.88 }]}
          >
            {({ pressed }) => (
              <>
                <View style={styles.ring}>
                  <View
                    style={[
                      styles.addWell,
                      { backgroundColor: colors.wash, borderColor: colors.line },
                    ]}
                  >
                    <View style={[styles.addBar, styles.addH, { backgroundColor: colors.ink }]} />
                    <View style={[styles.addBar, styles.addV, { backgroundColor: colors.ink }]} />
                  </View>
                </View>
                <MarqueeText
                  text="Add"
                  align="center"
                  paused={pressed}
                  fadeColor={colors.bg}
                  style={[styles.caption, { color: colors.mute }]}
                />
              </>
            )}
          </Pressable>
        </HoverTip>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 12,
    paddingVertical: 8,
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  cell: {
    width: 68,
    alignItems: 'center',
    gap: 4,
  },
  clickable: {
    cursor: 'pointer',
  },
  ring: {
    borderWidth: 2,
    borderRadius: 32,
    padding: 2,
  },
  rule: {
    width: StyleSheet.hairlineWidth,
    height: 56,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  caption: {
    ...type.badge,
    fontWeight: '600',
    width: 64,
    textAlign: 'center',
  },
  addWell: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBar: {
    position: 'absolute',
    borderRadius: 1,
  },
  addH: {
    width: 18,
    height: 2,
  },
  addV: {
    width: 2,
    height: 18,
  },
});
