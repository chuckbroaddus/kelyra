import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { isAllowedLessonNavigation } from '@/lib/lessons/allowlist';
import { injectLessonBase, looksLikeLessonHtml } from '@/lib/lessons/hostedHtml';
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
  const frame = useRef<HTMLIFrameElement | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onBlockedRef = useRef(onBlocked);
  onBlockedRef.current = onBlocked;
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;
  const [srcDoc, setSrcDoc] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    flushProgress() {
      const win = frame.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage({ type: 'kelyra.flush', state: 'in_progress' }, '*');
      } catch {
        // Hosted page may have navigated.
      }
    },
  }));

  useEffect(() => {
    let cancelled = false;
    setSrcDoc(null);
    (async () => {
      try {
        const res = await fetch(documentUrl, { cache: 'no-store' });
        if (res.status === 401) {
          onExpiredRef.current();
          return;
        }
        if (!res.ok) {
          onExpiredRef.current();
          return;
        }
        const text = await res.text();
        if (!looksLikeLessonHtml(text)) {
          onExpiredRef.current();
          return;
        }
        if (!cancelled) setSrcDoc(injectLessonBase(text, documentUrl));
      } catch {
        if (!cancelled) onExpiredRef.current();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentUrl]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source && event.source !== frame.current?.contentWindow) return;
      const payload = parseWebMessage(event.data);
      if (isLessonPageEvent(payload)) onEventRef.current(payload);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const postIdentity = () => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(identity, '*');
    } catch {
      // Hosted page may still be loading.
    }
  };

  return (
    <View style={styles.fill} collapsable={false}>
      {srcDoc ? (
        <iframe
          ref={frame}
          srcDoc={srcDoc}
          title="Lesson"
          style={iframeStyle}
          sandbox="allow-scripts allow-same-origin allow-forms"
          allow="autoplay; fullscreen"
          referrerPolicy="no-referrer"
          onLoad={() => {
            let blocked = false;
            try {
              const href = frame.current?.contentWindow?.location?.href;
              if (href && href !== 'about:blank' && !href.startsWith('about:srcdoc') && !isAllowedLessonNavigation(href, documentUrl)) {
                blocked = true;
              }
            } catch {
              if (!isAllowedLessonNavigation(documentUrl, documentUrl)) blocked = true;
            }
            if (blocked) {
              onBlockedRef.current();
              return;
            }
            postIdentity();
            setTimeout(postIdentity, 250);
            setTimeout(postIdentity, 1000);
          }}
          onError={() => onExpiredRef.current()}
        />
      ) : null}
    </View>
  );
});

const iframeStyle = {
  border: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  background: '#111',
} as const;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#111' },
});

