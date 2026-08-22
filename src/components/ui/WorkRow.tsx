import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { photoUri } from '@/components/ui/Avatar';
import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type WorkPill = {
  key: string;
  label: string;
  kind: 'primary' | 'secondary' | 'ghost';
  onPress: () => void;
};

export type WorkSwipeAction = {
  key: string;
  label: string;
  tone: 'brand' | 'wash' | 'danger';
  onPress: () => void;
  autoCommit?: boolean;
};

type Props = {
  title: string;
  status?: string;
  meta?: string;
  photoUrl?: string | null;
  avatarName?: string;
  /** Use the empty-seat mark instead of initials (unassigned person, no photo). */
  unknown?: boolean;
  /** Replaces the 72 media well (assignment glyph, etc.). */
  lead?: ReactNode;
  badge?: BadgeVariant;
  pills?: WorkPill[];
  leading?: WorkSwipeAction[];
  trailing?: WorkSwipeAction[];
  onPress?: () => void;
};

export function WorkRow({
  title,
  status,
  meta,
  photoUrl,
  avatarName,
  unknown,
  lead,
  badge,
  pills = [],
  leading = [],
  trailing = [],
  onPress,
}: Props) {
  const { colors, scheme } = useTheme();
  const width = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const start = useRef(0);
  const [swiping, setSwiping] = useState(false);

  const run = (action: WorkSwipeAction) => {
    snap(0);
    action.onPress();
  };

  const snap = (to: number) => {
    Animated.timing(x, {
      toValue: to,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && to === 0) setSwiping(false);
    });
  };

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        setSwiping(true);
        x.stopAnimation((value) => {
          start.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        const maxL = leading.length * 80;
        const maxR = trailing.length * 80;
        const next = start.current + g.dx;
        const clamped = Math.max(-maxR, Math.min(maxL, next));
        x.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        const rowW = width.current || 320;
        const offset = start.current + g.dx;
        const maxL = leading.length * 80;
        const maxR = trailing.length * 80;
        const full = Math.max(120, 0.4 * rowW);

        if (offset > 0 && leading[0]) {
          if (offset > full && leading[0].autoCommit) {
            run(leading[0]);
            return;
          }
          snap(offset > 56 ? maxL : 0);
          return;
        }
        if (offset < 0 && trailing[0]) {
          if (offset < -full && trailing[0].autoCommit) {
            run(trailing[0]);
            return;
          }
          snap(offset < -56 ? -Math.min(maxR, trailing.length * 80) : 0);
          return;
        }
        snap(0);
      },
    }),
  ).current;

  const tile = (action: WorkSwipeAction) => (
    <Pressable
      key={action.key}
      onPress={() => run(action)}
      style={[
        styles.tile,
        {
          backgroundColor:
            action.tone === 'brand'
              ? colors.brand
              : action.tone === 'danger'
                ? colors.danger
                : colors.wash,
          width: 80,
        },
      ]}
    >
      <Text
        style={[
          styles.tileLabel,
          {
            color:
              action.tone === 'brand'
                ? colors.brandInk
                : action.tone === 'danger'
                  ? scheme === 'dark'
                    ? '#1A120C'
                    : '#FFF8F3'
                  : colors.ink,
          },
        ]}
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );

  return (
    <View
      style={styles.clip}
      onLayout={(event) => {
        width.current = event.nativeEvent.layout.width;
      }}
    >
      <View style={styles.actions} pointerEvents="box-none">
        <View style={styles.lead}>{leading.map(tile)}</View>
        <View style={styles.trail}>{trailing.map(tile)}</View>
      </View>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.bg, borderBottomColor: colors.line, transform: [{ translateX: x }] },
        ]}
        {...responder.panHandlers}
      >
        <Pressable
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={status ? `${title}. ${status}` : title}
          onPress={onPress}
          style={({ pressed }) => [styles.inner, pressed && onPress ? { opacity: 0.88 } : null]}
        >
          {({ pressed }) => (
            <>
          {lead ? (
            <View style={[styles.media, styles.mediaEmpty, { borderColor: colors.line, backgroundColor: colors.wash }]}>
              {lead}
            </View>
          ) : photoUri(photoUrl) ? (
            <Image source={{ uri: photoUri(photoUrl)! }} style={[styles.media, { borderColor: colors.line, backgroundColor: colors.card }]} />
          ) : (
            <View style={[styles.media, styles.mediaEmpty, { borderColor: colors.line, backgroundColor: colors.wash }]}>
              {unknown ? <UnknownMark size={56} /> : <AvatarInitials name={avatarName ?? title} size={56} />}
            </View>
          )}
          <View style={styles.body}>
            <View style={styles.head}>
              <MarqueeText
                text={title}
                align="start"
                paused={pressed || swiping}
                fadeColor={colors.bg}
                style={[styles.title, { color: colors.ink }]}
              />
              {badge ? <Badge variant={badge} /> : null}
            </View>
            {status ? (
              <Text style={[styles.status, { color: colors.mute }]} numberOfLines={1}>
                {status}
              </Text>
            ) : null}
            {meta ? (
              <Text style={[styles.meta, { color: colors.mute }]} numberOfLines={1}>
                {meta}
              </Text>
            ) : null}
            {pills.length ? (
              <View style={styles.pills}>
                {pills.map((pill) => (
                  <Pressable
                    key={pill.key}
                    accessibilityRole="button"
                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                    onPress={pill.onPress}
                    style={({ pressed }) => [
                      styles.pill,
                      pill.kind === 'primary' && { backgroundColor: colors.brand },
                      pill.kind === 'secondary' && {
                        backgroundColor: colors.elevated,
                        borderWidth: 1,
                        borderColor: colors.line,
                      },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillLabel,
                        {
                          color:
                            pill.kind === 'primary'
                              ? colors.brandInk
                              : pill.kind === 'ghost'
                                ? colors.mute
                                : colors.ink,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {pill.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  actions: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lead: {
    flexDirection: 'row',
  },
  trail: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  tile: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inner: {
    flexDirection: 'row',
    gap: 12,
  },
  media: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  mediaEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...type.rowTitle,
    flex: 1,
    minWidth: 0,
  },
  status: type.meta,
  meta: type.meta,
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  pill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLabel: type.pill,
});
