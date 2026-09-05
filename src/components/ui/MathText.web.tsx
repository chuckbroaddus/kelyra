import { createElement, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import {
  renderKatexHtml,
  splitMathSegments,
  splitProseBlocks,
  type ProseBlock,
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
  style.textContent =
    KATEX_MIN_CSS +
    `
.kelyra-prose-root { max-width: 100%; }
.kelyra-prose-p { margin: 0 0 0.55em 0; padding: 0; white-space: pre-wrap; word-wrap: break-word; }
.kelyra-prose-p:last-child { margin-bottom: 0; }
.kelyra-prose-list {
  margin: 0.35em 0 0.55em 0;
  padding-left: 1.6em;
  list-style-position: outside;
}
.kelyra-prose-list > li { margin: 0.2em 0; padding-left: 0.15em; }
.kelyra-math-inline { display: inline; vertical-align: baseline; }
.kelyra-math-inline .katex { font-size: 1.05em; }
.kelyra-math-display {
  display: block;
  overflow-x: auto;
  max-width: 100%;
  margin: 0.5em 0;
  padding: 0.15em 0;
}
`;
  document.head.appendChild(style);
  cssInjected = true;
}

function flattenTextStyle(style: StyleProp<TextStyle> | undefined, color: string): CSSProperties {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const css: CSSProperties = {
    color,
    margin: 0,
    padding: 0,
  };
  if (typeof flat.fontSize === 'number') css.fontSize = flat.fontSize;
  if (flat.fontFamily) css.fontFamily = flat.fontFamily;
  if (flat.fontWeight != null) css.fontWeight = String(flat.fontWeight) as CSSProperties['fontWeight'];
  if (typeof flat.lineHeight === 'number') css.lineHeight = `${flat.lineHeight}px`;
  if (flat.fontStyle) css.fontStyle = flat.fontStyle;
  if (flat.textAlign) css.textAlign = flat.textAlign as CSSProperties['textAlign'];
  return css;
}

function renderInlineNodes(
  text: string,
  ink: string,
  textCss: CSSProperties,
  keyPrefix: string,
): ReactNode[] {
  const segments = splitMathSegments(text);
  const nodes: ReactNode[] = [];
  segments.forEach((seg, index) => {
    const key = `${keyPrefix}-${index}`;
    if (seg.kind === 'text') {
      nodes.push(createElement('span', { key, style: textCss }, seg.raw));
      return;
    }
    const displayMode = seg.kind === 'display';
    const html = renderKatexHtml(seg.raw, displayMode);
    if (!html) {
      const fallback = displayMode ? `$$${seg.raw}$$` : `$${seg.raw}$`;
      nodes.push(createElement('span', { key, style: textCss }, fallback));
      return;
    }
    if (displayMode) {
      nodes.push(
        createElement('div', {
          key,
          className: 'kelyra-math-display',
          style: { color: ink, display: 'block', overflowX: 'auto', maxWidth: '100%' },
          // KaTeX output of this span only — not the model blob
          dangerouslySetInnerHTML: { __html: html },
        }),
      );
      return;
    }
    nodes.push(
      createElement('span', {
        key,
        className: 'kelyra-math-inline',
        style: { color: ink, display: 'inline', verticalAlign: 'baseline' },
        // KaTeX output of this span only — not the model blob
        dangerouslySetInnerHTML: { __html: html },
      }),
    );
  });
  return nodes;
}

function renderBlock(
  block: ProseBlock,
  index: number,
  ink: string,
  textCss: CSSProperties,
): ReactNode {
  if (block.kind === 'paragraph') {
    return createElement(
      'p',
      { key: `p-${index}`, className: 'kelyra-prose-p', style: textCss },
      ...renderInlineNodes(block.text, ink, textCss, `p${index}`),
    );
  }
  if (block.kind === 'display') {
    const html = renderKatexHtml(block.raw, true);
    if (!html) {
      return createElement(
        'p',
        { key: `d-${index}`, className: 'kelyra-prose-p', style: textCss },
        `$$${block.raw}$$`,
      );
    }
    return createElement('div', {
      key: `d-${index}`,
      className: 'kelyra-math-display',
      style: { color: ink, display: 'block', overflowX: 'auto', maxWidth: '100%' },
      dangerouslySetInnerHTML: { __html: html },
    });
  }
  const tag = block.ordered ? 'ol' : 'ul';
  return createElement(
    tag,
    {
      key: `l-${index}`,
      className: 'kelyra-prose-list',
      style: { ...textCss, listStylePosition: 'outside', paddingLeft: '1.6em' },
    },
    ...block.items.map((item, itemIndex) =>
      createElement(
        'li',
        { key: `li-${index}-${itemIndex}`, style: { ...textCss, display: 'list-item' } },
        ...renderInlineNodes(item, ink, textCss, `l${index}i${itemIndex}`),
      ),
    ),
  );
}

/**
 * Web MathText — prose flow (p/ol/ul) with KaTeX spans on the sentence baseline.
 * Never dangerouslySetInnerHTML on the whole model blob (S1-01/03).
 * Not a flex-wrap row of Text + div siblings (MATHUI L-01).
 */
export function MathText({ children, style, color }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.ink;
  const source = children ?? '';
  const blocks = useMemo(() => splitProseBlocks(source), [source]);
  const textCss = useMemo(() => flattenTextStyle(style, ink), [style, ink]);

  useEffect(() => {
    ensureKatexCss();
  }, []);

  const hasListOrMath = blocks.some(
    (b) => b.kind === 'list' || b.kind === 'display' || (b.kind === 'paragraph' && /\$|\\\(|\\\[/.test(b.text)),
  );

  if (!hasListOrMath && blocks.length <= 1 && blocks[0]?.kind === 'paragraph') {
    return <Text style={[style, { color: ink }]}>{source}</Text>;
  }

  return createElement(
    'div',
    { className: 'kelyra-prose-root', style: { maxWidth: '100%', color: ink } },
    ...blocks.map((block, index) => renderBlock(block, index, ink, textCss)),
  );
}
