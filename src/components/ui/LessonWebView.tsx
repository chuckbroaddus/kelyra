import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { LESSON_BRIDGE_JS } from '@/lib/lessons/bridgeScript';
import {
  isAllowedLessonNavigation,
  isAllowedLessonSubresource,
  isFontHost,
} from '@/lib/lessons/allowlist';
import { injectLessonBase, lessonDocumentBase, looksLikeLessonHtml } from '@/lib/lessons/hostedHtml';
import {
  isLessonPageEvent,
  parseWebMessage,
  type LessonIdentity,
  type LessonPageEvent,
} from '@/lib/lessons/protocol';

type Props = {
  documentUrl: string;
  identity: LessonIdentity;
  onEvent: (event: LessonPageEvent) => void;
  onBlocked: () => void;
  onExpired: () => void;
};

export type LessonWebViewHandle = {
  flushProgress: () => void;
};

export const LessonWebView = forwardRef<LessonWebViewHandle, Props>(function LessonWebView(
  { documentUrl, identity, onEvent, onBlocked, onExpired },
  ref,
) {
  const view = useRef<WebView>(null);
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const injected = useMemo(() => injectScript(identity), [identity]);
  const [pageCanGoBack, setPageCanGoBack] = useState(false);
  const [page, setPage] = useState<{ html: string; baseUrl: string } | null>(null);

  useEffect(() => {
    setPageCanGoBack(false);
    setPage(null);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(documentUrl, { cache: 'no-store' });
        if (res.status === 401 || !res.ok) {
          onExpiredRef.current();
          return;
        }
        const text = await res.text();
        if (!looksLikeLessonHtml(text)) {
          onExpiredRef.current();
          return;
        }
        if (!cancelled) {
          setPage({
            html: injectLessonBase(text, documentUrl),
            baseUrl: lessonDocumentBase(documentUrl),
          });
        }
      } catch {
        if (!cancelled) onExpiredRef.current();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentUrl]);

  useImperativeHandle(ref, () => ({
    flushProgress() {
      view.current?.injectJavaScript(
        `try{window.__kelyraFlush&&window.__kelyraFlush('in_progress')}catch(e){};true;`,
      );
    },
  }));

  if (!page) return <View style={styles.fill} collapsable={false} />;

  return (
    <View style={styles.fill} collapsable={false}>
      <WebView
        ref={view}
        source={{ html: page.html, baseUrl: page.baseUrl }}
        style={styles.fill}
        originWhitelist={['http://*', 'https://*', 'about:*']}
        injectedJavaScriptBeforeContentLoaded={injected}
        injectedJavaScript={injected}
        onLoadEnd={() => {
          view.current?.injectJavaScript(injectScript(identity));
        }}
        onMessage={(event) => {
          const payload = parseWebMessage(event.nativeEvent.data);
          if (isLessonPageEvent(payload)) onEvent(payload);
        }}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          const top = request.isTopFrame !== false;
          if (url === documentUrl || url === page.baseUrl) return true;
          if (isFontHost(url) && !top) return true;
          if (!top && isAllowedLessonSubresource(url, documentUrl)) return true;
          if (isAllowedLessonNavigation(url, documentUrl)) return true;
          onBlocked();
          return false;
        }}
        onNavigationStateChange={(nav: WebViewNavigation) => {
          setPageCanGoBack(Boolean(nav.canGoBack));
          if (nav.url && !isAllowedLessonNavigation(nav.url, documentUrl) && !isFontHost(nav.url)) {
            onBlocked();
            view.current?.stopLoading();
          }
        }}
        onHttpError={(event) => {
          if (event.nativeEvent.statusCode === 401) onExpiredRef.current();
        }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView
        allowsBackForwardNavigationGestures={pageCanGoBack}
        setSupportMultipleWindows={false}
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        bounces={false}
        overScrollMode="never"
        nestedScrollEnabled
        javaScriptEnabled
        mixedContentMode="always"
        startInLoadingState={false}
      />
    </View>
  );
});

function injectScript(identity: LessonIdentity): string {
  const payload = JSON.stringify(identity);
  return `${LESSON_BRIDGE_JS}
    (function () {
      var msg = ${payload};
      try { window.postMessage(msg, '*'); } catch (e) {}
      try { document.dispatchEvent(new MessageEvent('message', { data: msg })); } catch (e2) {}
    })();
    true;`;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#111' },
});
