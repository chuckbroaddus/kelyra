import { createElement, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import {
  renderKatexHtml,
  segmentHasMath,
  splitMathSegments,
} from '@/components/ui/mathTextCore';
import { KATEX_MIN_CSS } from '@/components/ui/katexMinCss';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  /** Override ink; defaults to theme foreground. */
  color?: string;
};

let cssInjected = false;

function ensureKatexCss() {
  if (cssInjected || typeof document === 'undefined') return;
  if (document.getElementById('kelyra-katex-css')) {
    cssInjected = true;
    return;
  }
  const style = document.createElement('style');
  style.id = 'kelyra-katex-css';
  style.textContent = KATEX_MIN_CSS;
  document.head.appendChild(style);
  cssInjected = true;
}

/**
 * Web MathText — KaTeX HTML only on math spans (S1-01/03).
 * Never dangerouslySetInnerHTML on the whole model blob.
 */
export function MathText({ children, style, color }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.ink;
  const source = children ?? '';
  const segments = useMemo(() => splitMathSegments(source), [source]);

  useEffect(() => {
    ensureKatexCss();
  }, []);

  if (!segmentHasMath(segments)) {
    return <Text style={[style, { color: ink }]}>{source}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {segments.map((seg, index) => {
        if (seg.kind === 'text') {
          return (
            <Text key={`t-${index}`} style={[style, { color: ink }]}>
              {seg.raw}
            </Text>
          );
        }
        const displayMode = seg.kind === 'display';
        const html = renderKatexHtml(seg.raw, displayMode);
        if (!html) {
          const fallback = displayMode ? `$$${seg.raw}$$` : `$${seg.raw}$`;
          return (
            <Text key={`f-${index}`} style={[style, { color: ink }]}>
              {fallback}
            </Text>
          );
        }
        return createElement('div', {
          key: `m-${index}`,
          className: displayMode ? 'kelyra-math-display' : 'kelyra-math-inline',
          style: {
            color: ink,
            display: displayMode ? 'block' : 'inline',
            overflowX: displayMode ? 'auto' : undefined,
            maxWidth: '100%',
          },
          // KaTeX output of this span only — not the model blob
          dangerouslySetInnerHTML: { __html: html },
        });
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    maxWidth: '100%',
  },
});
