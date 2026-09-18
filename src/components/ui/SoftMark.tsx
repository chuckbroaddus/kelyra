import { useEffect, useMemo, useRef } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { softV8bHostDocument } from '@/components/ui/softV8bHostHtml';
import { SOFT_INTRO } from '@/components/ui/softLetterScale';

export type SoftMode = 'static' | 'working';

/**
 * Soft v8b working mark — SoT HTML host (WebView on native; SoftMark.web.tsx on web).
 * Bead SoftMark cannot match SoT preserve-3d + gas-svg; this ports the host.
 * Morph via `.is-on` on `.av`; idle letter stays KelyraMark Image `kelyra.png`.
 * SoftMark only while working — KelyraMark removes `.is-on` (mode=static) before unmount.
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
  const htmlDoc = useMemo(() => softV8bHostDocument(size, working), [size, working]);
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
        ref={webRef}
        originWhitelist={['*']}
        source={{ html: htmlDoc }}
        style={{ width: size, height: size, backgroundColor: 'transparent' }}
        containerStyle={{ backgroundColor: 'transparent' }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        allowFileAccess={false}
        setSupportMultipleWindows={false}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    overflow: Platform.OS === 'web' ? 'visible' : 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
