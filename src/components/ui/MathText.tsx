import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { WebView } from 'react-native-webview';

import {
  renderProseBodyHtml,
  segmentHasMath,
  splitMathSegments,
  splitProseBlocks,
  type ProseBlock,
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

function buildProseDocument(bodyHtml: string, color: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
<style>${KATEX_MIN_CSS}
html,body{margin:0;padding:0;background:transparent;color:${escapeAttr(color)};
overflow-x:hidden;overflow-y:hidden;}
.kelyra-prose-p{margin:0 0 0.55em 0;padding:0;white-space:pre-wrap;word-wrap:break-word;}
.kelyra-prose-p:last-child{margin-bottom:0;}
.kelyra-prose-list{margin:0.35em 0 0.55em 0;padding-left:1.6em;list-style-position:outside;}
.kelyra-prose-list>li{margin:0.2em 0;}
.kelyra-math-inline{display:inline;vertical-align:baseline;}
.kelyra-math-inline .katex{font-size:1.05em;}
.kelyra-math-display{display:block;overflow-x:auto;max-width:100%;margin:0.5em 0;}
</style></head><body>
<div class="kelyra-host">${bodyHtml}</div>
<script>
(function(){
  function report(){
    var h = Math.ceil(document.body.scrollHeight || 24);
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'size',height:h}));
    }
  }
  report();
  setTimeout(report, 50);
})();
</script>
</body></html>`;
}

function ProseWebView({ bodyHtml, color }: { bodyHtml: string; color: string }) {
  const [height, setHeight] = useState(48);
  const doc = useMemo(() => buildProseDocument(bodyHtml, color), [bodyHtml, color]);

  return (
    <View style={styles.proseHost}>
      <WebView
        originWhitelist={['about:blank']}
        source={{ html: doc, baseUrl: 'about:blank' }}
        style={{ height, backgroundColor: 'transparent', width: '100%' }}
        scrollEnabled={false}
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
              setHeight(Math.min(Math.max(data.height, 20), 2000));
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
 * Plain text stays RN Text. Parse failures → source Text (never blank).
 */
export function MathText({ children, style, color }: Props) {
  const { colors } = useTheme();
  const ink = color ?? colors.ink;
  const source = children ?? '';
  const blocks = useMemo(() => splitProseBlocks(source), [source]);
  const rich = useMemo(() => blocksNeedRichHtml(blocks, source), [blocks, source]);

  if (rich) {
    const bodyHtml = renderProseBodyHtml(blocks);
    return <ProseWebView bodyHtml={bodyHtml} color={ink} />;
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
    minHeight: 28,
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
