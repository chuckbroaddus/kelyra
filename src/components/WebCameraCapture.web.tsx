import { createElement, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type WebCameraCaptureProps = {
  onCapture: (uri: string, mimeType: string) => void;
  onCancel: () => void;
};

type CameraDevice = { deviceId: string; label: string };

export function WebCameraCapture({ onCapture, onCancel }: WebCameraCaptureProps) {
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
        .filter((item) => item.kind === 'videoinput')
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
    void start(null);
    return () => stopStream();
    // Mount once; switching cameras calls start() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <Text style={styles.meta}>Use the laptop or monitor camera, then snap.</Text>
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
          backgroundColor: '#111',
          borderRadius: 8,
        },
      })}
      {devices.length > 1 ? (
        <View style={styles.row}>
          {devices.map((device) => (
            <Pressable
              key={device.deviceId}
              style={[styles.chip, device.deviceId === deviceId ? styles.chipOn : null]}
              onPress={() => {
                setDeviceId(device.deviceId);
                void start(device.deviceId);
              }}
            >
              <Text style={styles.chipText}>{shortCameraLabel(device.label)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={snap}>
        <Text style={styles.buttonText}>Snap photo</Text>
      </Pressable>
      <Pressable
        style={styles.secondary}
        onPress={() => {
          stopStream();
          onCancel();
        }}
      >
        <Text style={styles.secondaryText}>Cancel camera</Text>
      </Pressable>
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
    gap: 10,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: {
    backgroundColor: '#dbeafe',
  },
  chipText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  error: {
    color: '#9b1c1c',
  },
});
