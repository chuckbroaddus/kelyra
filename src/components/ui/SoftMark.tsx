import { useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { softV8bHostDocument } from '@/components/ui/softV8bHostHtml';
import { softCometFacingInjectScript } from '@/components/ui/softCometFacing';
import { COMET_ORBIT, SOFT_INTRO } from '@/components/ui/softLetterScale';

export type SoftMode = 'static' | 'working';

/** Extra canvas pad so comet orbit / gas blur is not clipped on native WebView. */
const ORBIT_PAD_FRAC = 0.22;

/**
 * Soft v8b working mark — SoT HTML host (WebView on native; SoftMark.web.tsx on web).
 * Bead SoftMark cannot match SoT preserve-3d + gas-svg; this ports the host.
 * Morph via `.is-on` on `.av`; idle letter stays KelyraMark Image `kelyra.png`.
 * SoftMark only while working — KelyraMark removes `.is-on` (mode=static) before unmount.
 *
 * Native FIX-NOW: opaque={false}; overflow visible; host JS always-facing ball + phase occlusion.
 * Native Soft does NOT rely on HTML inline <script> (RN WebView often skips it) —
 * onLoadEnd injects softCometFacingInjectScript (mouth hide + facing/trail/phase-z).
 */
export function SoftMark({
  size,
  mode = 'static',
  style,
  accessibilityLabel,
  accessible = true,
}: {
  size: number;
  mode?: SoftMode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessible?: boolean;
}) {
  const working = mode === 'working';
  const pad = Math.ceil(size * ORBIT_PAD_FRAC);
  const hostSize = size + pad * 2;
  const htmlDoc = useMemo(
    () => softV8bHostDocument(size, working, pad),
    [size, working, pad],
  );
  const facingInject = useMemo(() => softCometFacingInjectScript(), []);
  // Remount WebView when host HTML changes — HMR alone does not remount source.html
  const webKey = `${htmlDoc.length}-js-beads-${COMET_ORBIT.ovalY}-${COMET_ORBIT.trailMode}`;
  const webRef = useRef<WebView>(null);

  useEffect(() => {
    const js = working
      ? `document.getElementById('soft-root')?.classList.add('is-on'); true;`
      : `document.getElementById('soft-root')?.classList.remove('is-on'); true;`
    webRef.current?.injectJavaScript(js);
  }, [working]);

  // Outro: KelyraMark sets mode=static then waits SOFT_INTRO.outroMs before unmount.
  void SOFT_INTRO.outroMs;

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      accessibilityRole={accessible && working ? 'progressbar' : undefined}
      accessibilityState={accessible && working ? { busy: true } : undefined}
      collapsable={false}
      style={[styles.canvas, { width: size, height: size }, style]}
    >
      <WebView
        key={webKey}
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: htmlDoc }}
        style={{
          width: hostSize,
          height: hostSize,
          marginLeft: -pad,
          marginTop: -pad,
          backgroundColor: 'transparent',
        }}
        containerStyle={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        pointerEvents="none"
        onLoadEnd={() => {
          webRef.current?.injectJavaScript(facingInject);
          if (working) {
            webRef.current?.injectJavaScript(
              `document.getElementById('soft-root')?.classList.add('is-on'); true;`,
            );
          }
        }}
        // RNW 13 types omit `opaque`; required so WKWebView stays transparent under Soft.
        {...({ opaque: false } as Record<string, unknown>)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
