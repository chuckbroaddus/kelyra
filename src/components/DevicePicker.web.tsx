import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
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
        <Chip
          key={device.deviceId}
          label={device.label}
          selected={device.deviceId === selectedId}
          onPress={() => onSelect(device.deviceId)}
        />
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
});
