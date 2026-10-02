import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type Props = {
  visible: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
};

/**
 * Orientations RN Modal must allow on phone. Default (empty) is portrait-only on
 * iPhone, which fights landscape immersive screens (Gradebook #325) and loops
 * layout when a sheet opens sideways.
 */
export const SCREEN_OVERLAY_ORIENTATIONS = [
  'portrait',
  'portrait-upside-down',
  'landscape',
  'landscape-left',
  'landscape-right',
] as const;

/**
 * Cover the app without presenting a new iOS view controller.
 * RN Modal on iOS creates a VC that expo-splash-screen does not own, which
 * throws: "No native splash screen registered for given view controller."
 * FullWindowOverlay also skips Modal's portrait-only lock on iPhone.
 */
export function ScreenOverlay({ visible, onRequestClose, children }: Props) {
  if (!visible) return null;
  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay>
        <View style={styles.fill} pointerEvents="box-none">
          {children}
        </View>
      </FullWindowOverlay>
    );
  }
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      supportedOrientations={[...SCREEN_OVERLAY_ORIENTATIONS]}
    >
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    flex: 1,
  },
});
