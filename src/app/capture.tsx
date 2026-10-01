/**
 * Capture route — thin wrapper over CaptureSurface + presets.
 * Main: full Ask AI / intent flow. Syllabus: /capture?preset=syllabus&classId=…
 */
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { CaptureSurface } from '@/components/capture/CaptureSurface';
import { useAuth } from '@/lib/auth/AuthProvider';
import { resolveCapturePreset } from '@/lib/capture/presets';

export default function CaptureScreen() {
  const params = useLocalSearchParams<{ preset?: string; classId?: string }>();
  const { teacher } = useAuth();

  const preset = useMemo(
    () =>
      resolveCapturePreset({
        presetId: typeof params.preset === 'string' ? params.preset : null,
        classId: typeof params.classId === 'string' ? params.classId : null,
        teacherId: teacher?.id ?? null,
      }),
    [params.preset, params.classId, teacher?.id],
  );

  return <CaptureSurface preset={preset} />;
}
