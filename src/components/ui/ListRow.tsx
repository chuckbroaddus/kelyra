import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { HoverTip, tipIfNew } from '@/components/ui/HoverTip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { MarqueeText } from '@/components/ui/MarqueeText';
import { type } from '@/constants/theme';
import { useSwipeRowOpen } from '@/lib/ui/swipeRowOpen';
import { decideSwipeSnap, decideSwipeTerminate, SWIPE_TILE } from '@/lib/ui/swipeRowSnap';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type ListSwipeAction = {
  key: string;
  label: string;
  tooltip?: string;
  tone: 'brand' | 'wash' | 'danger';
  onPress: () => void;
  autoCommit?: boolean;
};

type Props = {
  title: string;
  tooltip?: string;
  status?: string;
  /** Replaces the status line visually. `status` still feeds the spoken name if set. */
  statusNode?: ReactNode;
  avatarName?: string;
  photoUrl?: string | null;
  hasPhoto?: boolean;
  /** Replaces the default avatar. */
  avatar?: ReactNode;
  /** 22 pt glyph in the 36 avatar slot. Aligns with photo rows. */
  icon?: IconName;
  unknown?: boolean;
  chevron?: boolean;
  right?: ReactNode;
  onPress?: () => void;
  selected?: boolean;
  /** Waiting item: heavier title. Spoken as Unread. */
  unread?: boolean;
  leading?: ListSwipeAction[];
  trailing?: ListSwipeAction[];
};

export function ListRow({
  title,
  tooltip,
  status,
  statusNode,
  avatarName,
  photoUrl,
  hasPhoto,
  avatar,
  icon,
  unknown,
  chevron = true,
  right,
  onPress,
  selected,
  unread,
  leading = [],
  trailing = [],
}: Props) {
  const { colors } = useTheme();
  const width = useRef(0);
  const x = useRef(new Animated.Value(0)).current;
  const start = useRef(0);
  const openOffset = useRef(0);
  const grantFrom = useRef(0);
  const [swiping, setSwiping] = useState(false);
  const [open, setOpen] = useState(false);
  const swipable = leading.length + trailing.length > 0;
  // test-hook: leadingRef/trailingRef keep PanResponder snap widths current across renders
  const leadingRef = useRef(leading);
  const trailingRef = useRef(trailing);
  leadingRef.current = leading;
  trailingRef.current = trailing;

  useSwipeRowOpen(open && swipable);

  const markOpen = (value: number) => {
    openOffset.current = value;
    const next = value !== 0;
    setOpen((prev) => (prev === next ? prev : next));
  };

  const snap = (to: number) => {
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

  const run = (action: ListSwipeAction) => {
    Animated.timing(x, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      start.current = 0;
      markOpen(0);
      setSwiping(false);
      action.onPress();
    });
  };

  const responder = useRef(
    PanResponder.create({
      // Tap-to-close while open is handled in release — onStart claim steals from Pressable.
      onStartShouldSetPanResponder: () => openOffset.current !== 0,
      onStartShouldSetPanResponderCapture: () => openOffset.current !== 0,
      onMoveShouldSetPanResponder: (_, g) => {
        if (!leadingRef.current.length && !trailingRef.current.length) return false;
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
        const maxL = leadingRef.current.length * SWIPE_TILE;
        const maxR = trailingRef.current.length * SWIPE_TILE;
        const next = start.current + g.dx;
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
    if (openOffset.current !== 0 || open) {
      snap(0);
      return;
    }
    onPress?.();
  };

  const tile = (action: ListSwipeAction) => (
    <HoverTip key={action.key} label={tipIfNew(action.label, action.tooltip)}>
    <Pressable
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
    </HoverTip>
  );

  const face =
    avatar ??
    (icon ? (
      <View style={styles.glyph}>
        <Icon name={icon} color={colors.ink} size={22} />
      </View>
    ) : (
      <Avatar name={avatarName ?? title} photoUrl={photoUrl} hasPhoto={hasPhoto} size={36} unknown={unknown} />
    ));

  const spoken = `${unread ? 'Unread. ' : ''}${status ? `${title}. ${status}` : title}`;
  const pressable = onPress || swipable ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={spoken}
      onPress={onCardPress}
      style={({ pressed }) => [pressed && { opacity: 0.88 }]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.row,
            {
              borderBottomColor: colors.line,
              backgroundColor: selected ? colors.brandSoft : colors.bg,
              alignItems: statusNode ? 'flex-start' : 'center',
            },
          ]}
        >
          {face}
          <View style={styles.text}>
            <MarqueeText
              text={title}
              align="start"
              paused={pressed || swiping}
              fadeColor={selected ? colors.brandSoft : colors.bg}
              style={[styles.title, { color: colors.ink, fontWeight: unread ? '700' : '600' }]}
            />
            {statusNode ??
              (status ? (
                <Text style={[styles.status, { color: colors.mute }]} numberOfLines={1}>
                  {status}
                </Text>
              ) : null)}
          </View>
          {right}
          {chevron && onPress ? (
            <Text style={[styles.chevron, { color: colors.mute }]}>›</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  ) : null;

  const body = (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: colors.line,
          backgroundColor: selected ? colors.brandSoft : colors.bg,
          alignItems: statusNode ? 'flex-start' : 'center',
        },
      ]}
    >
      {face}
      <View style={styles.text}>
        <MarqueeText
          text={title}
          align="start"
          paused={swiping}
          fadeColor={selected ? colors.brandSoft : colors.bg}
          style={[styles.title, { color: colors.ink, fontWeight: unread ? '700' : '600' }]}
        />
        {statusNode ??
          (status ? (
            <Text style={[styles.status, { color: colors.mute }]} numberOfLines={1}>
              {status}
            </Text>
          ) : null)}
      </View>
      {right}
      {chevron && onPress ? (
        <Text style={[styles.chevron, { color: colors.mute }]}>›</Text>
      ) : null}
    </View>
  );

  const inner = pressable ? (
    tooltip ? <HoverTip label={tooltip} fill>{pressable}</HoverTip> : pressable
  ) : (
    body
  );

  if (!swipable) return inner;

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
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {inner}
      </Animated.View>
    </View>
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
  glyph: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 52,
    paddingVertical: 8,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...type.rowTitle,
    width: '100%',
  },
  status: type.meta,
  chevron: {
    fontSize: 18,
    width: 18,
    textAlign: 'center',
  },
});
