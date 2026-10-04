/** interpret-speech post-processing (shared by Edge interpret-speech and ai:dev). */

// deno-lint-ignore no-explicit-any
type Json = any;

export const SPEECH_CAPTURE_INTENTS = [
  'homework',
  'syllabus',
  'roster',
  'portrait',
  'parent_card',
  'student_card',
  'answer_key',
  'vehicle',
  'lesson_plan',
  'lesson_materials',
  'feed_photo',
] as const;

export type SpeechIntent = {
  intent: 'add_student' | 'note' | 'capture' | 'unknown';
  captureIntent: (typeof SPEECH_CAPTURE_INTENTS)[number] | null;
  studentName: string | null;
  parentName: string | null;
  skillLabel: string | null;
};

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

export function finalizeSpeechIntent(parsed: Json): SpeechIntent {
  const studentName = clean(parsed?.studentName);
  const parentName = clean(parsed?.parentName);
  const skillLabel = clean(parsed?.skillLabel);
  const captureIntent = (SPEECH_CAPTURE_INTENTS as readonly string[]).includes(parsed?.captureIntent)
    ? (parsed.captureIntent as SpeechIntent['captureIntent'])
    : null;
  const intent: SpeechIntent['intent'] =
    parsed?.intent === 'add_student' ||
    parsed?.intent === 'note' ||
    parsed?.intent === 'unknown' ||
    parsed?.intent === 'capture'
      ? parsed.intent
      : captureIntent
        ? 'capture'
        : studentName
          ? 'add_student'
          : 'unknown';
  return {
    intent,
    captureIntent,
    studentName: studentName || null,
    parentName: parentName || null,
    skillLabel: skillLabel || null,
  };
}
