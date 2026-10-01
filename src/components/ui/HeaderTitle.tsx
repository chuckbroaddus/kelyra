import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';

import { fitHeaderTitleSize } from '@/lib/chrome/headerTitleFit';

const nowrap = Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as TextStyle) : null;

/**
 * App header wordmark. One line, start-aligned. It shrinks to fit (down to 15 pt), then
 * ends in an ellipsis on the right. No marquee: a crawling header title showed the end of
 * the word with the start cut off (e.g. "ading policy" next to the school logo at 375).
 */
export function HeaderTitle({
  text,
  baseSize,
  lineHeight,
  color,
  style,
  accessible,
}: {
  text: string;
  baseSize: number;
  lineHeight: number;
  color: string;
  style: TextStyle;
  accessible: boolean;
}) {
  const [clip, setClip] = useState(0);
  const [natural, setNatural] = useState(0);
  const takeNatural = useCallback((width: number) => {
    if (width <= 1 || width > 3600) return;
    setNatural((current) => (Math.abs(current - width) < 0.5 ? current : width));
  }, []);
  const { fontSize } = fitHeaderTitleSize(clip, natural, baseSize);
  const scaledLine = Math.round((lineHeight * fontSize) / baseSize);

  return (
    <View
      style={styles.clip}
      accessible={accessible}
      accessibilityRole={accessible ? 'header' : undefined}
      accessibilityLabel={accessible ? text : undefined}
      onLayout={(event) => {
        const width = event.nativeEvent.layout.width;
        setClip((current) => (Math.abs(current - width) < 0.5 ? current : width));
      }}
    >
      <View pointerEvents="none" style={styles.measureBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text
          accessible={false}
          onLayout={(event) => takeNatural(event.nativeEvent.layout.width)}
          style={[style, { fontSize: baseSize, lineHeight }, styles.measureText]}
        >
          {text}
        </Text>
      </View>
      <Text
        accessible={false}
        importantForAccessibility="no"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[style, styles.shown, { color, fontSize, lineHeight: scaledLine }]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  measureBox: {
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 0,
    alignItems: 'flex-start',
    width: 4000,
  },
  measureText: {
    flexShrink: 0,
    alignSelf: 'flex-start',
    ...nowrap,
    ...(Platform.OS === 'web'
      ? ({ width: 'max-content', maxWidth: 'none' } as unknown as TextStyle)
      : null),
  },
  shown: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'left',
  },
});
