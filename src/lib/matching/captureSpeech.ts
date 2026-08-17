import { invokeAi } from '@/lib/ai/invoke';
import type { RosterName } from '@/lib/ai/types';
import {
  GRADE_KINDS,
  looksLikeSkipGrade,
  parseSpokenGradeKind,
  parseSpokenScore,
  type GradeKind,
  type ScoreMark,
} from '@/lib/grade/marks';
import { matchPaperName, shouldAutoAttach } from '@/lib/matching/matchName';
import { Platform } from 'react-native';

import { readUriAsBytes } from '@/lib/media/upload';

export type CaptureSpeechIntent = 'homework' | 'roster' | 'portrait' | 'parent_card' | 'student_card';

export type SpokenCaptureHint = {
  transcript: string;
  captureIntent: CaptureSpeechIntent | null;
  studentName: string | null;
  parentName: string | null;
  skipGrade: boolean;
  scoreMark: ScoreMark | null;
  numericScore: number | null;
  gradeKind: GradeKind | null;
};

const CAPTURE_INTENTS = new Set<CaptureSpeechIntent>([
  'homework',
  'roster',
  'portrait',
  'parent_card',
  'student_card',
]);

function asCaptureIntent(value: unknown): CaptureSpeechIntent | null {
  return typeof value === 'string' && CAPTURE_INTENTS.has(value as CaptureSpeechIntent)
    ? (value as CaptureSpeechIntent)
    : null;
}

function emptyHint(transcript = ''): SpokenCaptureHint {
  return {
    transcript,
    captureIntent: null,
    studentName: null,
    parentName: null,
    skipGrade: false,
    scoreMark: null,
    numericScore: null,
    gradeKind: null,
  };
}

/** Cheap phrase pass — no model. */
export function parseCaptureSpeechLocal(transcript: string): Omit<SpokenCaptureHint, 'transcript'> {
  const text = transcript.toLowerCase();
  const gradeKind = parseSpokenGradeKind(transcript);
  const spokenScore = parseSpokenScore(transcript);
  const skipGrade = looksLikeSkipGrade(transcript);
  let captureIntent: CaptureSpeechIntent | null = null;
  if (/\b(roster|class list|attendance|seating chart|name list)\b/.test(text)) {
    captureIntent = 'roster';
  } else if (/\b(portrait|profile (photo|picture)|school picture|yearbook)\b/.test(text)) {
    captureIntent = 'portrait';
  } else if (
    /\b(parent card|contact card|guardian card)\b/.test(text) ||
    (/\b(parent|guardian|mom|dad|mother|father)\b/.test(text) && /\b(card|form|contact)\b/.test(text))
  ) {
    captureIntent = 'parent_card';
  } else if (/\b(student card|emergency (card|form)|info card)\b/.test(text)) {
    captureIntent = 'student_card';
  } else if (
    gradeKind ||
    spokenScore ||
    skipGrade ||
    /\b(home\s*works?|work\s*sheet|work sheet|quiz|assignment|packet|grade|this is (her|his|their) work)\b/.test(text)
  ) {
    // A spoken mark or grade kind is a Grade, not a roster/portrait.
    captureIntent = 'homework';
  }

  return {
    captureIntent,
    studentName: null,
    parentName: null,
    skipGrade,
    scoreMark: skipGrade ? 'pass' : spokenScore?.mark ?? null,
    numericScore: skipGrade ? null : spokenScore?.score ?? null,
    gradeKind: gradeKind ?? (captureIntent === 'homework' ? 'homework' : null),
  };
}

export function matchSpokenStudent(
  spoken: string | null,
  roster: RosterName[],
): { studentId: string; displayName: string } | null {
  if (!spoken?.trim()) return null;
  const match = matchPaperName(spoken, roster);
  if (!shouldAutoAttach(match) || !match.guessedStudentId) return null;
  const row = roster.find((student) => student.studentId === match.guessedStudentId);
  if (!row) return null;
  return { studentId: row.studentId, displayName: row.displayName };
}

export async function resolveSpokenCapture(
  transcript: string,
  roster: RosterName[],
): Promise<SpokenCaptureHint> {
  const spoken = transcript.replace(/\s+/g, ' ').trim();
  if (!spoken) return emptyHint();

  const local = parseCaptureSpeechLocal(spoken);
  const fromRoster = matchSpokenStudent(spoken, roster);
  let captureIntent = local.captureIntent;
  let studentName = fromRoster?.displayName ?? null;
  let parentName: string | null = null;
  let skipGrade = local.skipGrade;
  let scoreMark = local.scoreMark;
  let numericScore = local.numericScore;
  let gradeKind = local.gradeKind;

  const words = spoken.split(' ').filter(Boolean);
  // Don't wait on interpret-speech just because they didn't say a score.
  const missing = (!captureIntent && !gradeKind) || !studentName;
  if (missing && words.length >= 2) {
    try {
      const data = await invokeAi<{
        captureIntent?: string | null;
        studentName?: string | null;
        parentName?: string | null;
        skipGrade?: boolean;
        scoreMark?: string | null;
        numericScore?: number | null;
        gradeKind?: string | null;
      }>('interpret-speech', { transcript: spoken, mode: 'capture' });
      captureIntent = asCaptureIntent(data.captureIntent) ?? captureIntent;
      const modelName = String(data.studentName ?? '').replace(/\s+/g, ' ').trim();
      if (modelName) {
        studentName = matchSpokenStudent(modelName, roster)?.displayName ?? studentName ?? modelName;
      }
      const modelParent = String(data.parentName ?? '').replace(/\s+/g, ' ').trim();
      if (modelParent) parentName = modelParent;
      if (data.skipGrade) {
        skipGrade = true;
        scoreMark = 'pass';
        numericScore = null;
      }
      if (data.scoreMark === 'pass' || data.scoreMark === 'fail' || data.scoreMark === 'numeric') {
        scoreMark = data.scoreMark;
      }
      if (typeof data.numericScore === 'number' && Number.isFinite(data.numericScore)) {
        numericScore = data.numericScore;
        scoreMark = scoreMark ?? 'numeric';
      }
      if (typeof data.gradeKind === 'string' && GRADE_KINDS.some((row) => row.key === data.gradeKind)) {
        gradeKind = data.gradeKind as GradeKind;
        captureIntent = captureIntent ?? 'homework';
      }
    } catch {
      // Local parse + roster match is enough if Grok is down.
    }
  }

  if (skipGrade) {
    scoreMark = 'pass';
    numericScore = null;
  }
  if ((gradeKind || scoreMark) && !captureIntent) captureIntent = 'homework';

  return {
    transcript: spoken,
    captureIntent,
    studentName,
    parentName,
    skipGrade,
    scoreMark,
    numericScore,
    gradeKind,
  };
}

export async function transcribeAudioDirect(input: {
  uri: string;
  mimeType: string;
  keyterms?: string[];
}): Promise<string> {
  const audioBase64 = await readUriAsBase64(input.uri);
  if (!audioBase64) return '';
  const { text } = await invokeAi<{ text?: string }>('transcribe-audio', {
    audioBase64,
    mimeType: input.mimeType,
    keyterms: input.keyterms ?? [],
  });
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

async function readUriAsBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') {
    const FileSystem = await import('expo-file-system/legacy');
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }
  const bytes = new Uint8Array(await readUriAsBytes(uri));
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}
