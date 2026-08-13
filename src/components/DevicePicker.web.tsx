import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import {
  listMediaDevices,
  unlockDeviceLabels,
  type MediaDeviceOption,
} from '@/lib/media/devices';

type DevicePickerProps = {
  kind: 'audio' | 'video';
  selectedId: string | null;
  onSelect: (deviceId: string) => void;
  nonce?: number;
};

export function DevicePicker({ kind, selectedId, onSelect, nonce }: DevicePickerProps) {
  const [devices, setDevices] = useState<MediaDeviceOption[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        await unlockDeviceLabels(kind);
      } catch {
        // Permission denied — chips stay hidden until the teacher allows access.
      }
      setDevices(await listMediaDevices(kind));
    })();
  }, [kind, selectedId, nonce]);

  if (devices.length < 2) return null;

  return (
    <View style={styles.row}>
      {devices.map((device) => (
        <Pressable
          key={device.deviceId}
          style={[styles.chip, device.deviceId === selectedId ? styles.chipOn : null]}
          onPress={() => onSelect(device.deviceId)}
        >
          <Text style={styles.chipText}>{device.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: {
    backgroundColor: colors.chipOn,
  },
  chipText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
