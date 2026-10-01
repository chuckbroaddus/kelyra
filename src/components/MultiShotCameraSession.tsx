import { CameraView, type CameraType } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton, PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { type } from '@/constants/theme';
import {
  MULTI_SHOT_BATCH_CAP,
  addShot,
  canAddShot,
  doneLabel,
  orderedUris,
  removeShot,
  shutterDisabledMessage,
  type MultiShot,
} from '@/lib/media/multiShotBatch';
import { useTheme } from '@/lib/theme/ThemeProvider';

export type MultiShotCameraSessionProps = {
  visible: boolean;
  max?: number;
  onDone: (photos: Array<{ uri: string; mimeType: string }>) => void;
  onCancel: () => void;
};

async function discardTempUri(uri: string): Promise<void> {
  if (!uri) return;
  if (Platform.OS === 'web') {
    if (uri.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(uri);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  try {
    const FileSystem = await import('expo-file-system/legacy');
    if (uri.startsWith('file://') || (FileSystem.cacheDirectory && uri.startsWith(FileSystem.cacheDirectory))) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    /* best-effort */
  }
}

async function discardShots(shots: MultiShot[]): Promise<void> {
  await Promise.all(shots.map((s) => discardTempUri(s.uri)));
}

/** Live multi-shot camera: stays open; Done returns ordered URIs. */
export function MultiShotCameraSession({
  visible,
  max = MULTI_SHOT_BATCH_CAP,
  onDone,
  onCancel,
}: MultiShotCameraSessionProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [shots, setShots] = useState<MultiShot[]>([]);
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capHint, setCapHint] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [flashOpaque, setFlashOpaque] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setShots([]);
      setReady(false);
      setBusy(false);
      setError(null);
      setCapHint(null);
      setReviewId(null);
      setFacing('back');
      setFlashOpaque(false);
      if (flashTimer.current) {
        clearTimeout(flashTimer.current);
        flashTimer.current = null;
      }
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const pulseFlash = useCallback(() => {
    setFlashOpaque(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => {
      setFlashOpaque(false);
      flashTimer.current = null;
    }, 140);
  }, []);

  const finishCancel = useCallback(async () => {
    const batch = shots;
    setShots([]);
    setReviewId(null);
    await discardShots(batch);
    onCancel();
  }, [onCancel, shots]);

  const requestClose = useCallback(() => {
    if (shots.length === 0) {
      void finishCancel();
      return;
    }
    const n = shots.length;
    Alert.alert(
      'Discard photos?',
      n === 1 ? 'Throw away this photo?' : `Throw away all ${n} photos?`,
      [
        { text: 'Keep shooting', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void finishCancel();
          },
        },
      ],
    );
  }, [finishCancel, shots.length]);

  const onShutter = async () => {
    if (busy || !ready) return;
    if (!canAddShot(shots.length, max)) {
      setCapHint(shutterDisabledMessage(shots.length, max));
      return;
    }
    const cam = cameraRef.current;
    if (!cam) {
      setError('Camera is not ready yet.');
      return;
    }
    setBusy(true);
    setError(null);
    setCapHint(null);
    pulseFlash();
    try {
      const picture = await cam.takePictureAsync({
        quality: 0.7,
        shutterSound: true,
        exif: false,
      });
      if (!picture?.uri) {
        setError('Could not capture a photo.');
        return;
      }
      setShots((current) => {
        const result = addShot(
          current,
          {
            uri: picture.uri,
            mimeType: picture.format === 'png' ? 'image/png' : 'image/jpeg',
          },
          max,
        );
        if (!result.added) {
          void discardTempUri(picture.uri);
          setCapHint(shutterDisabledMessage(current.length, max));
        } else if (result.atCap) {
          setCapHint(shutterDisabledMessage(result.shots.length, max));
        }
        return result.shots;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not capture a photo.');
    } finally {
      setBusy(false);
    }
  };

  const onDeleteReviewed = () => {
    if (!reviewId) return;
    setShots((current) => {
      const result = removeShot(current, reviewId);
      if (result.removed) void discardTempUri(result.removed.uri);
      return result.shots;
    });
    setReviewId(null);
    setCapHint(null);
  };

  const onPressDone = () => {
    if (!shots.length) return;
    const batch = orderedUris(shots);
    setShots([]);
    setReviewId(null);
    onDone(batch);
  };

  const reviewShot = shots.find((s) => s.id === reviewId) ?? null;
  const atCap = !canAddShot(shots.length, max);
  const count = shots.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={requestClose}
    >
      <View style={[styles.root, { backgroundColor: '#000', paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <GhostButton align="left" label="Cancel" onPress={requestClose} />
          {count > 0 ? (
            <PrimaryButton label={doneLabel(count)} onPress={onPressDone} />
          ) : (
            <Text style={[type.meta, { color: '#ccc' }]}>Take photos, then Done</Text>
          )}
        </View>

        <View style={styles.preview}>
          {visible ? (
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              mode="picture"
              animateShutter
              onCameraReady={() => setReady(true)}
              onMountError={(event) => {
                setError(event.message || 'Could not open the camera.');
              }}
            />
          ) : null}
          {flashOpaque ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash]} /> : null}
        </View>

        {error ? (
          <Text style={[type.body, styles.banner, { color: colors.danger, backgroundColor: '#1a120c' }]}>
            {error}
          </Text>
        ) : null}
        {capHint ? (
          <Text style={[type.meta, styles.banner, { color: '#fff', backgroundColor: '#333' }]}>{capHint}</Text>
        ) : null}

        {count > 0 ? (
          <ScrollView
            horizontal
            style={styles.tray}
            contentContainerStyle={styles.trayContent}
            showsHorizontalScrollIndicator={false}
          >
            {shots.map((shot, index) => (
              <Pressable
                key={shot.id}
                accessibilityLabel={`Review photo ${index + 1}`}
                onPress={() => setReviewId(shot.id)}
                style={[styles.thumbWrap, { borderColor: '#fff' }]}
              >
                <Image source={{ uri: shot.uri }} style={styles.thumb} />
                <Text style={styles.thumbNum}>{index + 1}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.traySpacer} />
        )}

        {/*
          iOS-style bottom bar: flip | big round shutter | count.
          Do not use SecondaryButton here — its base width is 100% and steals the row.
          Hardware volume/side buttons are not wired by expo-camera; leave them alone.
        */}
        <View style={[styles.controls, { paddingBottom: Math.max(16, insets.bottom + 4) }]}>
          <View style={styles.sideSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={facing === 'back' ? 'Front camera' : 'Back camera'}
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              style={({ pressed }) => [styles.flipHit, pressed && { opacity: 0.75 }]}
            >
              <Icon name="focus" color="#fff" size={22} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={atCap ? shutterDisabledMessage(count, max) || 'At limit' : 'Shutter'}
            accessibilityState={{ disabled: busy || !ready || atCap }}
            disabled={busy || !ready || atCap}
            onPress={() => void onShutter()}
            style={({ pressed }) => [
              styles.shutterOuter,
              (busy || !ready || atCap) && styles.shutterDisabled,
              pressed && !(busy || !ready || atCap) && { opacity: 0.88, transform: [{ scale: 0.96 }] },
            ]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.sideSlot}>
            <Text style={[type.meta, styles.countText]} accessibilityLabel={`${count} of ${max} photos`}>
              {count}/{max}
            </Text>
          </View>
        </View>
      </View>

      <Modal visible={Boolean(reviewShot)} animationType="fade" transparent onRequestClose={() => setReviewId(null)}>
        <View style={styles.reviewRoot}>
          {reviewShot ? (
            <>
              <Image source={{ uri: reviewShot.uri }} style={styles.reviewImage} resizeMode="contain" />
              <View style={[styles.reviewActions, { paddingBottom: insets.bottom + 12 }]}>
                <SecondaryButton label="Delete" onPress={onDeleteReviewed} />
                <PrimaryButton label="Back to camera" onPress={() => setReviewId(null)} />
              </View>
            </>
          ) : null}
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    minHeight: 52,
    gap: 8,
  },
  preview: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
  flash: {
    backgroundColor: '#fff',
    opacity: 0.85,
  },
  banner: { paddingHorizontal: 12, paddingVertical: 8 },
  tray: { maxHeight: 88, backgroundColor: 'rgba(0,0,0,0.72)' },
  traySpacer: { height: 12 },
  trayContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8, alignItems: 'center' },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    marginRight: 8,
  },
  thumb: { width: '100%', height: '100%' },
  thumbNum: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowRadius: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingHorizontal: 28,
    backgroundColor: '#0a0a0a',
  },
  sideSlot: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipHit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  shutterDisabled: {
    opacity: 0.35,
  },
  countText: {
    color: '#ddd',
    textAlign: 'center',
    minWidth: 48,
  },
  reviewRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  reviewImage: { width: '100%', height: '70%' },
  reviewActions: { gap: 10, paddingHorizontal: 16, paddingTop: 12 },
});
