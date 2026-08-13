import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const MIC_KEY = 'kelyra.preferredMic';
const CAMERA_KEY = 'kelyra.preferredCamera';

export type MediaDeviceOption = {
  deviceId: string;
  label: string;
};

export async function getPreferredDeviceId(kind: 'audio' | 'video'): Promise<string | null> {
  return AsyncStorage.getItem(kind === 'audio' ? MIC_KEY : CAMERA_KEY);
}

export async function setPreferredDeviceId(kind: 'audio' | 'video', deviceId: string) {
  await AsyncStorage.setItem(kind === 'audio' ? MIC_KEY : CAMERA_KEY, deviceId);
}

export function shortDeviceLabel(kind: 'audio' | 'video', label: string, index: number): string {
  if (/continuity|iphone|ipad/i.test(label)) return 'iPhone';
  if (/face|built-?in|macbook|facetime|internal/i.test(label)) return 'Laptop';
  if (/display|monitor|studio display|sidecar/i.test(label)) return 'Monitor';
  if (/usb|external|logitech|webcam/i.test(label)) return kind === 'audio' ? 'USB mic' : 'USB camera';
  if (label.trim()) return compactLabel(label);
  return kind === 'audio' ? `Mic ${index + 1}` : `Camera ${index + 1}`;
}

function compactLabel(label: string): string {
  const cleaned = label.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 28 ? `${cleaned.slice(0, 26)}…` : cleaned;
}

function uniqueSuffix(label: string, index: number): string {
  const leftover = label
    .replace(/microphone|camera|audio|video|default|built-?in/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (leftover && leftover.length <= 18) return leftover;
  if (leftover) return `${leftover.slice(0, 16)}…`;
  return String(index + 1);
}

export async function listMediaDevices(kind: 'audio' | 'video'): Promise<MediaDeviceOption[]> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return [];
  }
  const list = await navigator.mediaDevices.enumerateDevices();
  const matchKind = kind === 'audio' ? 'audioinput' : 'videoinput';
  const seenGroups = new Set<string>();
  const raw = list.filter((item) => {
    if (item.kind !== matchKind || !item.deviceId) return false;
    if (item.deviceId === 'default' || item.deviceId === 'communications') return false;
    if (item.groupId) {
      if (seenGroups.has(item.groupId)) return false;
      seenGroups.add(item.groupId);
    }
    return true;
  });

  const labeled = raw.map((item, index) => ({
    deviceId: item.deviceId,
    label: shortDeviceLabel(kind, item.label, index),
    original: item.label,
  }));

  const counts = new Map<string, number>();
  for (const item of labeled) {
    counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
  }

  return labeled.map((item, index) => ({
    deviceId: item.deviceId,
    label:
      (counts.get(item.label) ?? 0) > 1
        ? `${item.label} (${uniqueSuffix(item.original, index)})`
        : item.label,
  }));
}
