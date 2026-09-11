import { useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { photoUri } from '@/components/ui/Avatar';
import { RemoteImage } from '@/components/ui/RemoteImage';
import { AvatarInitials } from '@/components/ui/AvatarInitials';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { UnknownMark } from '@/components/ui/UnknownMark';
import { radius, type } from '@/constants/theme';
import { useSwipeRowOpen } from '@/lib/ui/swipeRowOpen';
import { decideSwipeSnap, decideSwipeTerminate, SWIPE_TILE } from '@/lib/ui/swipeRowSnap';
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
  /** Replaces the status badge (e.g. a status glyph). */
  end?: ReactNode;
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
  end,
  pills = [],
  leading = [],
  trailing = [],
  onPress,
}: Props) {
  const { colors } = useTheme();
  const width = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const start = useRef(0);
  const openOffset = useRef(0);
  const grantFrom = useRef(0);
  const [swiping, setSwiping] = useState(false);
  const [open, setOpen] = useState(false);
  // test-hook: leadingRef/trailingRef keep PanResponder snap widths current across renders
  const leadingRef = useRef(leading);
  const trailingRef = useRef(trailing);
  leadingRef.current = leading;
  trailingRef.current = trailing;

  useSwipeRowOpen(open);

  const markOpen = (value: number) => {
    openOffset.current = value;
    const next = value !== 0;
    setOpen((prev) => (prev === next ? prev : next));
  };

  const run = (action: WorkSwipeAction) => {
    snap(0);
    action.onPress();
  };

  const snap = (to: number) => {
    // Keep claim/tap logic aligned with the resting target even if a later
    // gesture interrupts the timing callback (finished === false).
    openOffset.current = to;
    if (to !== 0) {
      setOpen((prev) => (prev ? prev : true));
    }
    Animated.timing(x, {
      toValue: to,
      duration: 160,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      markOpen(to);
      setSwiping(false);
    });
  };

  const responder = useRef(
    PanResponder.create({
      // When actions are open, claim early so stack back-gesture cannot steal LTR close.
      // Tap-to-close is handled in onPanResponderRelease (Pressable never sees the press).
      onStartShouldSetPanResponder: () => openOffset.current !== 0,
      onStartShouldSetPanResponderCapture: () => openOffset.current !== 0,
      onMoveShouldSetPanResponder: (_, g) => {
        if (openOffset.current !== 0) {
          return Math.abs(g.dx) > 2 && Math.abs(g.dx) >= Math.abs(g.dy);
        }
        return Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy);
      },
      onMoveShouldSetPanResponderCapture: (_, g) => {
        if (openOffset.current === 0) return false;
        return Math.abs(g.dx) > 2 && Math.abs(g.dx) >= Math.abs(g.dy);
      },
      onPanResponderTerminationRequest: () => openOffset.current === 0,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        setSwiping(true);
        x.stopAnimation((value) => {
          start.current = value;
          openOffset.current = value;
          grantFrom.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        const leadActs = leadingRef.current;
        const trailActs = trailingRef.current;
        const maxL = leadActs.length * SWIPE_TILE;
        const maxR = trailActs.length * SWIPE_TILE;
        const next = start.current + g.dx;
        // LTR disabled when no leading (maxL=0); open snap uses full −trailing.length * SWIPE_TILE
        const clamped = Math.max(-maxR, Math.min(maxL, next));
        openOffset.current = clamped;
        x.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        const leadActs = leadingRef.current;
        const trailActs = trailingRef.current;
        const decision = decideSwipeSnap({
          grantX: grantFrom.current,
          offset: start.current + g.dx,
          gesture: { dx: g.dx, dy: g.dy, vx: g.vx },
          leadCount: leadActs.length,
          trailCount: trailActs.length,
          rowWidth: width.current || 320,
        });
        if (decision.kind === 'auto') {
          const action = decision.side === 'lead' ? leadActs[0] : trailActs[0];
          if (action?.autoCommit) {
            run(action);
            return;
          }
          snap(decision.side === 'lead' ? leadActs.length * SWIPE_TILE : -trailActs.length * SWIPE_TILE);
          return;
        }
        snap(decision.to);
      },
      onPanResponderTerminate: () => {
        snap(
          decideSwipeTerminate(
            openOffset.current,
            leadingRef.current.length,
            trailingRef.current.length,
          ),
        );
      },
    }),
  ).current;

  const onCardPress = () => {
    // Tap foreground while open closes actions only (no detail navigation).
    // Prefer openOffset; fall back to React `open` if a close snap already zeroed the ref.
    if (openOffset.current !== 0 || open) {
      snap(0);
      return;
    }
    onPress?.();
  };

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
                ? colors.dangerBrick
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
                  ? '#FFF8F3'
                  : colors.ink,
          },
        ]}
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );

  const bodyProps = {
    title,
    status,
    meta,
    photoUrl,
    avatarName,
    unknown,
    lead,
    badge,
    end,
    pills,
  };

  // Always pressable when swipe actions exist so tap-to-close works without onPress.
  const swipable = leading.length + trailing.length > 0;
  const cardPressable = Boolean(onPress) || swipable;

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
        {cardPressable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={status ? `${title}. ${status}` : title}
            onPress={onCardPress}
            style={({ pressed }) => [styles.inner, pressed ? { opacity: 0.88 } : null]}
          >
            {({ pressed }) => (
              <WorkRowBody {...bodyProps} paused={pressed || swiping} />
            )}
          </Pressable>
        ) : (
          <View style={styles.inner} accessibilityLabel={status ? `${title}. ${status}` : title}>
            <WorkRowBody {...bodyProps} paused={swiping} />
          </View>
        )}
      </Animated.View>
    </View>
  );
}

function WorkRowBody({
  title,
  status,
  meta,
  photoUrl,
  avatarName,
  unknown,
  lead,
  badge,
  end,
  pills,
  paused,
}: {
  title: string;
  status?: string;
  meta?: string;
  photoUrl?: string | null;
  avatarName?: string;
  unknown?: boolean;
  lead?: ReactNode;
  badge?: BadgeVariant;
  end?: ReactNode;
  pills: WorkPill[];
  paused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <>
      {lead ? (
        <View style={[styles.media, styles.mediaEmpty, { borderColor: colors.line, backgroundColor: colors.wash }]}>
          {lead}
        </View>
      ) : photoUri(photoUrl) ? (
        <RemoteImage
          uri={photoUri(photoUrl)!}
          style={[styles.media, { borderColor: colors.line, backgroundColor: colors.card }]}
        />
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
            paused={paused}
            fadeColor={colors.bg}
            style={[styles.title, { color: colors.ink }]}
          />
          {end ? end : badge ? <Badge variant={badge} /> : null}
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
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  actions: {
    ...StyleSheet.absoluteFill,
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
    alignSelf: 'stretch',
    minHeight: 72,
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
    overflow: 'hidden',
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
