import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  clampNativeWebViewHeight,
  proseHtmlHasMountedKatex,
  renderProseBodyHtml,
  segmentHasMath,
  splitMathSegments,
  splitProseBlocks,
  type ProseBlock,
} from '@/components/ui/mathTextCore';
import { KATEX_MIN_CSS_NATIVE } from '@/components/ui/katexMinCss';
import { useTheme } from '@/lib/theme/ThemeProvider';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  color?: string;
};

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Offline prose document for one bubble WebView.
 * layoutWidth (from parent onLayout) is injected so KaTeX/display wrap to the bubble.
 */
function buildProseDocument(bodyHtml: string, color: string, layoutWidth: number): string {
  const w = layoutWidth > 0 ? Math.floor(layoutWidth) : 0;
  const viewport =
    w > 0
      ? `<meta name="viewport" content="width=${w},initial-scale=1,maximum-scale=1"/>`
      : `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>`;
  const hostWidth =
    w > 0
      ? `.kelyra-host{width:${w}px;max-width:100%;box-sizing:border-box;}`
      : `.kelyra-host{max-width:100%;box-sizing:border-box;}`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
${viewport}
<style>${KATEX_MIN_CSS_NATIVE}
html,body{margin:0;padding:0;background:transparent;color:${escapeAttr(color)};
overflow-x:hidden;overflow-y:hidden;-webkit-text-size-adjust:100%;}
${hostWidth}
.kelyra-prose-p{margin:0 0 0.55em 0;padding:0;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;}
.kelyra-prose-p:last-child{margin-bottom:0;}
.kelyra-prose-list{margin:0.35em 0 0.55em 0;padding-left:1.6em;list-style-position:outside;}
.kelyra-prose-list>li{margin:0.2em 0;}
.kelyra-math-inline{display:inline;vertical-align:baseline;}
.kelyra-math-inline .katex{font-size:1.05em;}
.kelyra-math-display{
  display:block;
  overflow-x:auto;
  overflow-y:hidden;
  max-width:100%;
  margin:0.5em 0;
  -webkit-overflow-scrolling:touch;
  overscroll-behavior-x:contain;
}
.kelyra-math-display .katex-display{margin:0;overflow-x:visible;}
</style></head><body>
<div class="kelyra-host">${bodyHtml}</div>
<script>
(function(){
  function measure(){
    var host = document.querySelector('.kelyra-host') || document.body;
    var h = Math.ceil(Math.max(
      host.scrollHeight || 0,
      host.offsetHeight || 0,
      document.documentElement ? document.documentElement.scrollHeight || 0 : 0,
      document.body.scrollHeight || 0,
      24
    ));
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'size',height:h}));
    }
  }
  function schedule(){
    measure();
    setTimeout(measure, 16);
    setTimeout(measure, 100);
  }
  var settled = false;
  function once(){
    if (settled) return;
    settled = true;
    schedule();
  }
  // Measure after fonts (or timeout) so height fits real metrics — never hang on missing faces.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(once).catch(once);
    setTimeout(once, 400);
  } else {
    once();
  }
})();
</script>
</body></html>`;
}

function ProseWebView({
  bodyHtml,
  color,
  fallbackText,
  style,
}: {
  bodyHtml: string;
  color: string;
  fallbackText: string;
  style?: StyleProp<TextStyle>;
}) {
  const [height, setHeight] = useState(28);
  const [layoutWidth, setLayoutWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [measured, setMeasured] = useState(false);
  const doc = useMemo(
    () => buildProseDocument(bodyHtml, color, layoutWidth),
    [bodyHtml, color, layoutWidth],
  );

  // If measure never arrives, fall back to Text — never leave an empty slab.
  useEffect(() => {
    setFailed(false);
    setMeasured(false);
    setHeight(28);
    const t = setTimeout(() => {
      setMeasured((ok) => {
        if (!ok) setFailed(true);
        return ok;
      });
    }, 1600);
    return () => clearTimeout(t);
  }, [doc]);

  if (failed) {
    return <Text style={[style, { color }]}>{fallbackText}</Text>;
  }

  return (
    <View
      style={styles.proseHost}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - layoutWidth) > 0.5) {
          setLayoutWidth(w);
        }
      }}
    >
      <WebView
        originWhitelist={['about:blank']}
        source={{ html: doc, baseUrl: 'about:blank' }}
        style={{ height, backgroundColor: 'transparent', width: '100%', maxWidth: '100%' }}
        // Vertical scroll stays with the page; display math swipes horizontally via CSS overflow-x.
        scrollEnabled={false}
        nestedScrollEnabled
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
            if (data.type === 'size') {
              const next = clampNativeWebViewHeight(data.height);
              if (next == null) {
                setFailed(true);
                return;
              }
              setMeasured(true);
              setHeight(next);
            }
          } catch {
            /* ignore */
          }
        }}
      />
    </View>
  );
}

function NativeList({
  ordered,
  items,
  style,
  color,
}: {
  ordered: boolean;
  items: string[];
  style?: StyleProp<TextStyle>;
  color: string;
}) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`li-${index}`} style={styles.listRow}>
          <Text style={[styles.marker, style, { color }]}>
            {ordered ? `${index + 1}.` : '•'}
          </Text>
          <Text style={[styles.listBody, style, { color }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function blocksNeedRichHtml(blocks: ProseBlock[], source: string): boolean {
  if (segmentHasMath(splitMathSegments(source))) return true;
  return blocks.some((b) => b.kind === 'display');
}

/**
 * Native MathText — one offline WebView per bubble when math is present
 * (not one WebView per $ span). Lists without math use a fixed marker column.
 * Plain text stays RN Text. Parse / measure failures → source Text (never blank).
 */
export function MathText({ children, style, color }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.ink;
  const source = children ?? '';
  const blocks = useMemo(() => splitProseBlocks(source), [source]);
  const rich = useMemo(() => blocksNeedRichHtml(blocks, source), [blocks, source]);

  if (rich) {
    const bodyHtml = renderProseBodyHtml(blocks);
    // KaTeX fail for every span → Text fallback (never a blank WebView slab)
    if (!proseHtmlHasMountedKatex(bodyHtml)) {
      return <Text style={[style, { color: ink }]}>{source}</Text>;
    }
    return (
      <ProseWebView bodyHtml={bodyHtml} color={ink} fallbackText={source} style={style} />
    );
  }

  if (blocks.length === 1 && blocks[0]?.kind === 'paragraph') {
    return <Text style={[style, { color: ink }]}>{source}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') {
          return (
            <Text key={`p-${index}`} style={[style, { color: ink, marginBottom: 6 }]}>
              {block.text}
            </Text>
          );
        }
        if (block.kind === 'list') {
          return (
            <NativeList
              key={`l-${index}`}
              ordered={block.ordered}
              items={block.items}
              style={style}
              color={ink}
            />
          );
        }
        const fallback = `$$${block.raw}$$`;
        return (
          <Text key={`d-${index}`} style={[style, { color: ink }]}>
            {fallback}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxWidth: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  proseHost: {
    width: '100%',
    maxWidth: '100%',
    minHeight: 28,
    alignSelf: 'stretch',
  },
  list: {
    marginVertical: 4,
    maxWidth: '100%',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    maxWidth: '100%',
  },
  marker: {
    width: 28,
    textAlign: 'right',
    marginRight: 8,
  },
  listBody: {
    flex: 1,
    flexShrink: 1,
  },
});
