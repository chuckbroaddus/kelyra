import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';

type Props = {
  visible: boolean;
  onRequestClose?: () => void;
  children: ReactNode;
};

/**
 * Cover the app without presenting a new iOS view controller.
 * RN Modal on iOS creates a VC that expo-splash-screen does not own, which
 * throws: "No native splash screen registered for given view controller."
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
    <Modal visible transparent animationType="fade" onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
});
