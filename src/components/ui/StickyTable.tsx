import { type ReactNode, useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMarqueeScroll } from '@/components/ui/MarqueeText';
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
  const { scrollHandlers } = useMarqueeScroll();
  const headRef = useRef<ScrollView>(null);
  const bodyRef = useRef<ScrollView>(null);
  const driver = useRef<'head' | 'body' | null>(null);
  const unlock = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headX = useRef(0);
  const bodyX = useRef(0);

  const hold = (who: 'head' | 'body') => {
    driver.current = who;
    if (unlock.current) clearTimeout(unlock.current);
    unlock.current = setTimeout(() => {
      driver.current = null;
    }, 160);
  };

  const onHead = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    headX.current = x;
    if (driver.current === 'body') return;
    if (Math.abs(bodyX.current - x) < 0.5) return;
    hold('head');
    bodyRef.current?.scrollTo({ x, y: 0, animated: false });
  };

  const onBody = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    bodyX.current = x;
    if (driver.current === 'head') return;
    if (Math.abs(headX.current - x) < 0.5) return;
    hold('body');
    headRef.current?.scrollTo({ x, y: 0, animated: false });
  };

  const keepHeadOverBody = () => {
    if (Math.abs(headX.current - bodyX.current) < 0.5) return;
    hold('body');
    headRef.current?.scrollTo({ x: bodyX.current, y: 0, animated: false });
  };

  useEffect(
    () => () => {
      if (unlock.current) clearTimeout(unlock.current);
    },
    [],
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

  const headerCells = (
    <View style={styles.row}>
      {columns.map((column) => (
        <Pressable
          key={column.key}
          disabled={!column.onHeaderPress}
          onPress={column.onHeaderPress}
          style={[
            styles.headCell,
            { width: column.width, height: headHeight, backgroundColor: colors.wash, borderColor: colors.line },
          ]}
        >
          {column.renderTitle ? (
            column.renderTitle()
          ) : (
            <Text style={[styles.headText, { color: colors.ink }]} numberOfLines={titleLines}>
              {column.title}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );

  // Titles live in a full-width scroller with left padding equal to the name
  // column. iOS sticky headers pull the nested ScrollView to x=0; the padding
  // plus an overlayed "Student" cell keeps titles over their columns anyway.
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
      <ScrollView
        ref={headRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        directionalLockEnabled
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onHead}
        onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
        onScrollEndDrag={scrollHandlers.onScrollEndDrag}
        onMomentumScrollEnd={(event) => {
          keepHeadOverBody();
          scrollHandlers.onMomentumScrollEnd?.(event);
        }}
        style={styles.headScroll}
        contentContainerStyle={{ paddingLeft: frozenWidth }}
      >
        {headerCells}
      </ScrollView>
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
        stickyHeaderIndices={leading ? [1] : [0]}
        scrollEventThrottle={16}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.vContent}
        onScroll={(event) => {
          chrome?.onScroll(event);
          keepHeadOverBody();
        }}
        onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
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
              <ScrollView
                ref={bodyRef}
                horizontal
                showsHorizontalScrollIndicator
                directionalLockEnabled
                nestedScrollEnabled
                scrollEventThrottle={16}
                onScroll={onBody}
                onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
                onScrollEndDrag={scrollHandlers.onScrollEndDrag}
                onMomentumScrollEnd={(event) => {
                  keepHeadOverBody();
                  scrollHandlers.onMomentumScrollEnd?.(event);
                }}
                style={[styles.bodyScroll, { height: bodyHeight }]}
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
              </ScrollView>
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
    paddingBottom: 28,
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
  headScroll: {
    width: '100%',
    height: '100%',
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
