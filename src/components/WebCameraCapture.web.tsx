import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { PrimaryButton, SecondaryButton } from '@/components/ui/Button';
import { radius, type } from '@/constants/theme';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { getPreferredDeviceId, setPreferredDeviceId } from '@/lib/media/devices';

type WebCameraCaptureProps = {
  onCapture: (uri: string, mimeType: string) => void;
  onCancel: () => void;
  deviceId?: string | null;
};

type CameraDevice = { deviceId: string; label: string };

export function WebCameraCapture({ onCapture, onCancel, deviceId: requestedId }: WebCameraCaptureProps) {
  const { colors } = useTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const start = async (id?: string | null) => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: id
          ? { deviceId: { exact: id }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const node = videoRef.current;
      if (node) {
        node.srcObject = stream;
        await node.play();
      }
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list
        .filter(
          (item) =>
            item.kind === 'videoinput' &&
            item.deviceId &&
            item.deviceId !== 'default' &&
            item.deviceId !== 'communications',
        )
        .map((item, index) => ({
          deviceId: item.deviceId,
          label: item.label || `Camera ${index + 1}`,
        }));
      setDevices(cams);
      const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
      if (activeId) setDeviceId(activeId);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open a camera. Allow camera access in the browser.',
      );
    }
  };

  useEffect(() => {
    void (async () => {
      const preferred = requestedId ?? (await getPreferredDeviceId('video'));
      try {
        await start(preferred);
      } catch {
        await start(null);
      }
    })();
    return () => stopStream();
    // Restart when the teacher picks a different camera chip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedId]);

  const snap = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setError('Camera is not ready yet.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setError('Could not capture a frame.');
      return;
    }
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture a frame.');
          return;
        }
        stopStream();
        onCapture(URL.createObjectURL(blob), 'image/jpeg');
      },
      'image/jpeg',
      0.85,
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[type.meta, { color: colors.mute }]}>
        Listening while you shoot. Say the grade, the name, the mark.
      </Text>
      {createElement('video', {
        ref: (node: HTMLVideoElement | null) => {
          videoRef.current = node;
        },
        autoPlay: true,
        playsInline: true,
        muted: true,
        style: {
          width: '100%',
          maxHeight: 360,
          backgroundColor: colors.wash,
          borderRadius: radius.lg,
        },
      })}
      {devices.length > 1 ? (
        <View style={styles.row}>
          {devices.map((device) => (
            <Chip
              key={device.deviceId}
              label={shortCameraLabel(device.label)}
              selected={device.deviceId === deviceId}
              onPress={() => {
                setDeviceId(device.deviceId);
                void setPreferredDeviceId('video', device.deviceId);
                void start(device.deviceId);
              }}
            />
          ))}
        </View>
      ) : null}
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <PrimaryButton label="Snap photo" onPress={snap} />
      <SecondaryButton
        label="Cancel"
        onPress={() => {
          stopStream();
          onCancel();
        }}
      />
    </View>
  );
}

function shortCameraLabel(label: string): string {
  if (/continuity|iphone|ipad/i.test(label)) return 'iPhone';
  if (/face|built-?in|macbook|facetime/i.test(label)) return 'Laptop';
  if (/display|monitor|studio display|sidecar/i.test(label)) return 'Monitor';
  if (/usb|external|logitech|webcam/i.test(label)) return 'USB camera';
  return label.length > 28 ? `${label.slice(0, 26)}…` : label;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  error: type.body,
});
