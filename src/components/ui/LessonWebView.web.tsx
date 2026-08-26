import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { isAllowedLessonNavigation, originOf } from '@/lib/lessons/allowlist';
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
  const targetOrigin = originOf(documentUrl) ?? '*';

  useImperativeHandle(ref, () => ({
    flushProgress() {
      const win = frame.current?.contentWindow;
      if (!win) return;
      try {
        win.postMessage({ type: 'kelyra.flush', state: 'in_progress' }, targetOrigin === '*' ? '*' : targetOrigin);
      } catch {
        // Hosted page may have navigated.
      }
    },
  }));

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (targetOrigin !== '*' && event.origin !== targetOrigin) return;
      const payload = parseWebMessage(event.data);
      if (isLessonPageEvent(payload)) onEventRef.current(payload);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [targetOrigin]);

  const postIdentity = () => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(identity, targetOrigin === '*' ? '*' : targetOrigin);
    } catch {
      // Hosted page may still be loading.
    }
  };

  return (
    <View style={styles.fill} collapsable={false}>
      <iframe
        ref={frame}
        src={documentUrl}
        title="Lesson"
        style={iframeStyle}
        sandbox="allow-scripts allow-same-origin allow-forms"
        allow="autoplay; fullscreen"
        referrerPolicy="no-referrer"
        onLoad={() => {
          const href = frame.current?.contentWindow?.location?.href;
          if (href && href !== 'about:blank' && !isAllowedLessonNavigation(href, documentUrl)) {
            onBlockedRef.current();
            frame.current?.contentWindow?.location.replace(documentUrl);
            return;
          }
          postIdentity();
          setTimeout(postIdentity, 250);
          setTimeout(postIdentity, 1000);
        }}
        onError={() => onExpiredRef.current()}
      />
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
