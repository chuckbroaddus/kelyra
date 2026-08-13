import type { ReactElement } from 'react';

export type DevicePickerProps = {
  kind: 'audio' | 'video';
  selectedId: string | null;
  onSelect: (deviceId: string) => void;
  nonce?: number;
};

/** Native stub. Web uses DevicePicker.web.tsx. */
export function DevicePicker(_props: DevicePickerProps): ReactElement | null {
  return null;
}
