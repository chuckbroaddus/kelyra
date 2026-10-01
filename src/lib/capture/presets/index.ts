export type { CaptureAccept, CaptureItem, CapturePreset, CaptureSubmitResult } from './types';
export { mainCapturePreset } from './main';
export { buildSyllabusCapturePreset, type SyllabusPresetOpts } from './syllabus';

import { mainCapturePreset } from './main';
import { buildSyllabusCapturePreset } from './syllabus';
import type { CapturePreset } from './types';

export type ResolveCapturePresetArgs = {
  presetId?: string | null;
  classId?: string | null;
  teacherId?: string | null;
};

/** Route helper: /capture?preset=syllabus&classId=… */
export function resolveCapturePreset(args: ResolveCapturePresetArgs): CapturePreset {
  const id = (args.presetId || 'main').trim().toLowerCase();
  if (id === 'syllabus') {
    if (!args.classId || !args.teacherId) {
      // Incomplete route → fall back to main rather than crashing.
      return mainCapturePreset;
    }
    return buildSyllabusCapturePreset({ classId: args.classId, teacherId: args.teacherId });
  }
  return mainCapturePreset;
}
