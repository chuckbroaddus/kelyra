import { type ReactNode, useRef } from 'react';
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
  const driving = useRef<'none' | 'head' | 'body'>('none');
  const unlock = useRef<ReturnType<typeof setTimeout> | null>(null);

  const follow = (who: 'head' | 'body', x: number) => {
    if (driving.current === (who === 'head' ? 'body' : 'head')) return;
    driving.current = who;
    if (who === 'head') bodyRef.current?.scrollTo({ x, y: 0, animated: false });
    else headRef.current?.scrollTo({ x, y: 0, animated: false });
    if (unlock.current) clearTimeout(unlock.current);
    unlock.current = setTimeout(() => {
      driving.current = 'none';
    }, 80);
  };

  const endH = () => {
    driving.current = 'none';
    if (unlock.current) clearTimeout(unlock.current);
  };

  const onHead = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    follow('head', event.nativeEvent.contentOffset.x);
  };

  const onBodyH = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    follow('body', event.nativeEvent.contentOffset.x);
  };

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

  const panX = Platform.OS === 'web' ? ({ touchAction: 'pan-x' } as const) : null;

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
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        onScroll={onHead}
        onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
        onScrollEndDrag={(event) => {
          endH();
          scrollHandlers.onScrollEndDrag?.(event);
        }}
        onMomentumScrollEnd={(event) => {
          endH();
          scrollHandlers.onMomentumScrollEnd?.(event);
        }}
        style={[styles.headScroll, panX]}
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
                keyboardShouldPersistTaps="handled"
                onScroll={onBodyH}
                onScrollBeginDrag={scrollHandlers.onScrollBeginDrag}
                onScrollEndDrag={(event) => {
                  endH();
                  scrollHandlers.onScrollEndDrag?.(event);
                }}
                onMomentumScrollEnd={(event) => {
                  endH();
                  scrollHandlers.onMomentumScrollEnd?.(event);
                }}
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
