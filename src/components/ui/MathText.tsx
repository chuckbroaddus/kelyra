import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  renderKatexHtml,
  segmentHasMath,
  splitMathSegments,
  type MathSegment,
} from '@/components/ui/mathTextCore';
import { KATEX_MIN_CSS } from '@/components/ui/katexMinCss';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  color?: string;
};

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function buildMathDocument(html: string, color: string, displayMode: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>${KATEX_MIN_CSS}
html,body{margin:0;padding:0;background:transparent;color:${escapeAttr(color)};
overflow-x:${displayMode ? 'auto' : 'hidden'};overflow-y:hidden;}
.katex{font-size:1.05em;}
.kelyra-host{display:${displayMode ? 'block' : 'inline-block'};}
</style></head><body>
<div class="kelyra-host">${html}</div>
<script>
(function(){
  function report(){
    var h = Math.ceil(document.body.scrollHeight || 24);
    var w = Math.ceil(document.body.scrollWidth || 40);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'size',height:h,width:w}));
    }
  }
  report();
  setTimeout(report, 50);
})();
</script>
</body></html>`;
}

function MathWebSpan({
  html,
  color,
  displayMode,
}: {
  html: string;
  color: string;
  displayMode: boolean;
}) {
  const [height, setHeight] = useState(displayMode ? 48 : 28);
  const doc = useMemo(() => buildMathDocument(html, color, displayMode), [html, color, displayMode]);

  return (
    <View style={displayMode ? styles.displayHost : styles.inlineHost}>
      <WebView
        originWhitelist={['about:blank']}
        source={{ html: doc, baseUrl: 'about:blank' }}
        style={{ height, backgroundColor: 'transparent', width: displayMode ? '100%' : undefined, minWidth: displayMode ? undefined : 40 }}
        scrollEnabled={displayMode}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        // S1-06: no model-injected JS; layout-only script is ours above
        injectedJavaScript={undefined}
        onShouldStartLoadWithRequest={(req) => {
          // Block navigations (file scheme / http(s)) — offline document only
          if (!req.url || req.url === 'about:blank' || req.url.startsWith('about:blank')) return true;
          return false;
        }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data) as { type?: string; height?: number };
            if (data.type === 'size' && typeof data.height === 'number' && data.height > 0) {
              setHeight(Math.min(Math.max(data.height, 20), 400));
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}

function FallbackText({
  seg,
  style,
  color,
}: {
  seg: MathSegment;
  style?: StyleProp<TextStyle>;
  color: string;
}) {
  if (seg.kind === 'text') {
    return <Text style={[style, { color }]}>{seg.raw}</Text>;
  }
  const fallback = seg.kind === 'display' ? `$$${seg.raw}$$` : `$${seg.raw}$`;
  return <Text style={[style, { color }]}>{fallback}</Text>;
}

/**
 * Native MathText — offline WebView for KaTeX HTML spans only.
 * Plain text stays RN Text. Parse failures → source Text (never blank).
 */
export function MathText({ children, style, color }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.ink;
  const source = children ?? '';
  const segments = useMemo(() => splitMathSegments(source), [source]);

  if (!segmentHasMath(segments)) {
    return <Text style={[style, { color: ink }]}>{source}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {segments.map((seg, index) => {
        if (seg.kind === 'text') {
          return <FallbackText key={`t-${index}`} seg={seg} style={style} color={ink} />;
        }
        const displayMode = seg.kind === 'display';
        const html = renderKatexHtml(seg.raw, displayMode);
        if (!html) {
          return <FallbackText key={`f-${index}`} seg={seg} style={style} color={ink} />;
        }
        return <MathWebSpan key={`m-${index}`} html={html} color={ink} displayMode={displayMode} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    maxWidth: '100%',
  },
  inlineHost: {
    minHeight: 24,
    minWidth: 32,
    maxWidth: '100%',
  },
  displayHost: {
    width: '100%',
    minHeight: 40,
    marginVertical: 4,
  },
});
