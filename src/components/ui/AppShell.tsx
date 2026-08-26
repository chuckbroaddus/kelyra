import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { ContextMenuRow } from '@/components/ui/ContextMenuRow';
import { FloatingTabTray } from '@/components/ui/FloatingTabTray';
import { HamburgerDrawer } from '@/components/ui/HamburgerDrawer';
import { ListenSheet } from '@/components/ui/ListenSheet';
import { MarqueeScrollProvider } from '@/components/ui/MarqueeText';
import { WebCameraCapture } from '@/components/WebCameraCapture';
import { ChromeProvider, useChrome } from '@/lib/chrome/ChromeProvider';
import { useLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeProvider';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ChromeProvider>
      <MarqueeScrollProvider>
        <ShellFrame>{children}</ShellFrame>
      </MarqueeScrollProvider>
    </ChromeProvider>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const chromeState = useChrome();
  const layout = useLayout();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <AppHeader />
      {layout.showTopBar ? <FloatingTabTray /> : null}
      <View style={styles.body}>
        {children}
        <ContextMenuRow />
        {!layout.showTopBar ? <FloatingTabTray /> : null}
      </View>
      <HamburgerDrawer />
      {chromeState.headerListenOpen ? (
        <View style={[styles.camera, { backgroundColor: colors.bg, top: chromeState.headerHeight }]}>
          <ListenSheet
            listening={chromeState.headerListening}
            onTakePhoto={chromeState.onHeaderTakePhoto}
            onVoiceOnly={chromeState.onHeaderVoiceOnly}
            onCancel={chromeState.cancelHeaderListen}
          />
        </View>
      ) : null}
      {chromeState.headerCameraOpen ? (
        <View style={[styles.camera, { backgroundColor: colors.bg, top: chromeState.headerHeight }]}>
          <WebCameraCapture
            onCapture={chromeState.onHeaderPhoto}
            onCancel={() => chromeState.setHeaderCameraOpen(false)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    padding: 16,
  },
});
