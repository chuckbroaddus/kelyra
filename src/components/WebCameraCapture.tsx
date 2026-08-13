import type { ReactElement } from 'react';

export type WebCameraCaptureProps = {
  onCapture: (uri: string, mimeType: string) => void;
  onCancel: () => void;
};

/** Native stub. Web uses WebCameraCapture.web.tsx. */
export function WebCameraCapture(_props: WebCameraCaptureProps): ReactElement | null {
  return null;
}
