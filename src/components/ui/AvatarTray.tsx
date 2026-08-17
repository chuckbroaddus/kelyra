import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { MarqueeText, useMarqueeScroll } from '@/components/ui/MarqueeText';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { type } from '@/constants/theme';
import { firstName } from '@/lib/format';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type TrayPerson = {
  id: string;
  name: string;
  photoUrl?: string | null;
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
};

export function AvatarTray({ people, selectedId, onPress, allowUnknown, onUnknown }: Props) {
  const { colors } = useTheme();
  const { scrollHandlers } = useMarqueeScroll();
  if (!people.length && !allowUnknown) return null;
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
          <Pressable
            key={person.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={firstName(person.name)}
            disabled={!onPress}
            onPress={() => onPress?.(person)}
            style={({ pressed }) => [styles.cell, pressed && { opacity: 0.88 }]}
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
                  <Avatar name={person.name} photoUrl={person.photoUrl} size={56} />
                </View>
                <MarqueeText
                  text={firstName(person.name)}
                  align="center"
                  paused={pressed}
                  fadeColor={colors.bg}
                  style={[styles.caption, { color: selected ? colors.brand : colors.ink }]}
                />
              </>
            )}
          </Pressable>
        );
      })}
      {allowUnknown ? (
        <>
          <View style={[styles.rule, { backgroundColor: colors.line }]} />
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
        </>
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
});
