import { type ReactNode, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMarqueeScroll } from '@/components/ui/MarqueeText';
import { useScrollBottomPad } from '@/components/ui/Screen';
import { type } from '@/constants/theme';
import { useOptionalChrome } from '@/lib/chrome/ChromeProvider';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type StickyColumn<T> = {
  key: string;
  title: string;
  width: number;
  render: (row: T, index: number) => ReactNode;
  renderTitle?: () => ReactNode;
  onHeaderPress?: () => void;
};

type Props<T> = {
  rows: T[];
  rowKey: (row: T) => string;
  frozenTitle?: string;
  frozenWidth?: number;
  renderFrozen: (row: T, index: number) => ReactNode;
  columns: StickyColumn<T>[];
  rowHeight?: number;
  headHeight?: number;
  titleLines?: number;
  empty?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  rowTone?: (row: T, index: number) => 'stripe' | 'group';
};

/**
 * Frozen first column + horizontally scrolling grid.
 *
 * Horizontal motion has one owner: the body Animated.ScrollView. The sticky
 * header mirrors the same offset with a native-driven translateX so finger
 * lag and end bounce stay locked (no dual ScrollView onScroll→scrollTo pair).
 */
export function StickyTable<T>({
  rows,
  rowKey,
  frozenTitle = 'Student',
  frozenWidth = 128,
  renderFrozen,
  columns,
  rowHeight = 44,
  headHeight = 56,
  titleLines = 2,
  empty,
  leading,
  trailing,
  rowTone,
}: Props<T>) {
  const { colors } = useTheme();
  const chrome = useOptionalChrome();
  const scrollBottomPad = useScrollBottomPad(28);
  const { scrollHandlers } = useMarqueeScroll();
  // Shared body→header offset (incl. rubber-band overscroll).
  const scrollX = useRef(new Animated.Value(0)).current;
  const onBodyH = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver: true,
      }),
    [scrollX],
  );
  const headerShiftStyle = useMemo(
    () => ({
      transform: [{ translateX: Animated.multiply(scrollX, -1) }],
    }),
    [scrollX],
  );

  if (!rows.length) {
    return (
      <View>
        {leading}
        <Text style={[styles.empty, { color: colors.mute }]}>{empty ?? 'Nothing here yet.'}</Text>
        {trailing}
      </View>
    );
  }

  const bodyHeight = rows.length * rowHeight;
  const panX = Platform.OS === 'web' ? ({ touchAction: 'pan-x' } as const) : null;

  const headerCells = (
    <View style={styles.row}>
      {columns.map((column) => {
        const inner = column.renderTitle ? (
          column.renderTitle()
        ) : (
          <Text style={[styles.headText, { color: colors.ink }]} numberOfLines={titleLines}>
            {column.title}
          </Text>
        );
        const box = [
          styles.headCell,
          { width: column.width, height: headHeight, backgroundColor: colors.wash, borderColor: colors.line },
        ];
        if (column.onHeaderPress) {
          return (
            <Pressable key={column.key} onPress={column.onHeaderPress} style={box}>
              {inner}
            </Pressable>
          );
        }
        return (
          <View key={column.key} style={box}>
            {inner}
          </View>
        );
      })}
    </View>
  );

  const headerRow = (
    <View
      collapsable={false}
      style={[
        styles.stickyHead,
        {
          height: headHeight,
          backgroundColor: colors.wash,
          borderColor: colors.line,
        },
      ]}
    >
      {/* Header mirrors body contentOffset.x — not a second ScrollView. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.headMirror, { paddingLeft: frozenWidth }, headerShiftStyle, panX]}
      >
        {headerCells}
      </Animated.View>
      <View
        pointerEvents="none"
        style={[
          styles.frozenHead,
          {
            width: frozenWidth,
            height: headHeight,
            backgroundColor: colors.wash,
            borderColor: colors.line,
          },
        ]}
      >
        <Text style={[styles.headText, { color: colors.ink }]}>{frozenTitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.shell}>
      <ScrollView
        style={styles.vScroll}
        bounces
        alwaysBounceVertical
        stickyHeaderIndices={leading ? [1] : [0]}
        scrollEventThrottle={16}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.vContent, { paddingBottom: scrollBottomPad }]}
        onScroll={(event) => {
          chrome?.onScroll(event);
        }}
        onScrollBeginDrag={(event) => {
          chrome?.onScrollBeginDrag(event);
          scrollHandlers.onScrollBeginDrag?.(event);
        }}
        onScrollEndDrag={scrollHandlers.onScrollEndDrag}
        onMomentumScrollEnd={scrollHandlers.onMomentumScrollEnd}
      >
        {leading ? <View>{leading}</View> : null}
        {headerRow}
        <View
          style={[
            styles.grid,
            { borderColor: colors.line, backgroundColor: colors.card, height: bodyHeight },
          ]}
        >
          <View style={[styles.bodyRow, { height: bodyHeight }]}>
            <View style={[styles.frozenCol, { width: frozenWidth, height: bodyHeight }]}>
              {rows.map((row, index) => (
                <View
                  key={rowKey(row)}
                  style={[
                    styles.bodyCell,
                    styles.nameCell,
                    {
                      width: frozenWidth,
                      height: rowHeight,
                      backgroundColor:
                        rowTone?.(row, index) === 'group'
                          ? colors.wash
                          : index % 2 === 1
                            ? colors.elevated
                            : colors.card,
                      borderColor: colors.line,
                    },
                  ]}
                >
                  {renderFrozen(row, index)}
                </View>
              ))}
            </View>
            <View style={[styles.hClip, { height: bodyHeight }]}>
              <Animated.ScrollView
                horizontal
                bounces
                alwaysBounceHorizontal
                showsHorizontalScrollIndicator
                directionalLockEnabled
                nestedScrollEnabled
                scrollEventThrottle={1}
                keyboardShouldPersistTaps="handled"
                onScroll={onBodyH}
                onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
                onScrollEndDrag={scrollHandlers.onScrollEndDrag}
                onMomentumScrollEnd={scrollHandlers.onMomentumScrollEnd}
                style={[styles.bodyScroll, panX, { height: bodyHeight }]}
                contentContainerStyle={{ height: bodyHeight }}
              >
                <View style={{ height: bodyHeight }}>
                  {rows.map((row, index) => (
                    <View key={rowKey(row)} style={styles.row}>
                      {columns.map((column) => (
                        <View
                          key={column.key}
                          style={[
                            styles.bodyCell,
                            styles.dataCell,
                            {
                              width: column.width,
                              height: rowHeight,
                              backgroundColor:
                                rowTone?.(row, index) === 'group'
                                  ? colors.wash
                                  : index % 2 === 1
                                    ? colors.elevated
                                    : colors.card,
                              borderColor: colors.line,
                            },
                          ]}
                        >
                          {column.render(row, index)}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </Animated.ScrollView>
            </View>
          </View>
        </View>
        {trailing ? <View>{trailing}</View> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 0,
  },
  vScroll: {
    flex: 1,
  },
  vContent: {
    // paddingBottom comes from useScrollBottomPad (tray clearance on content).
    flexGrow: 0,
  },
  stickyHead: {
    zIndex: 4,
    width: '100%',
    overflow: 'hidden',
    ...Platform.select({
      web: { position: 'sticky', top: 0 } as object,
      default: {},
    }),
  },
  headMirror: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  frozenHead: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 6,
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
  },
  frozenCol: {
    flexShrink: 0,
    zIndex: 2,
  },
  hClip: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  bodyScroll: {
    flexGrow: 0,
  },
  grid: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  headCell: {
    padding: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bodyCell: {
    borderWidth: 1,
    justifyContent: 'center',
  },
  dataCell: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headText: {
    ...type.cell,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  empty: type.body,
});
