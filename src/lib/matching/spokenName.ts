import { invokeAi } from '@/lib/ai/invoke';
import type { RosterName } from '@/lib/ai/types';
import { matchName, normalizeName, shouldAutoAttach } from '@/lib/matching/matchName';

const CUE = /^(hey |ok |okay |um |uh )?(add( student)?|new student|student|this is|it's|it is)\s+/i;
const TRAIL = /[.,!?]+$|\s+(to (the )?(class|roster|list)|please)$/i;

export async function interpretSpokenStudentName(transcript: string): Promise<string | null> {
  const spoken = transcript.replace(/\s+/g, ' ').trim();
  if (!spoken) return null;
  try {
    const data = await invokeAi<{ studentName?: string | null }>('interpret-speech', {
      transcript: spoken,
    });
    const fromModel = String(data.studentName ?? '').replace(/\s+/g, ' ').trim();
    if (fromModel) return fromModel;
  } catch {
    // Fall through to the local cue stripper if Grok is offline.
  }
  return extractSpokenStudentName(spoken);
}

export function extractSpokenStudentName(transcript: string): string | null {
  let text = transcript.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  text = text.replace(CUE, '').replace(TRAIL, '').trim();
  const words = text.split(' ').filter(Boolean);
  if (words.length < 1 || words.length > 5) return null;
  if (words.every((word) => word.length < 2)) return null;
  return words.map(titleCaseWord).join(' ');
}

function titleCaseWord(word: string): string {
  if (/^[A-Za-z]\.?$/.test(word)) return word.toUpperCase().replace(/\.$/, '');
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function namesAreEquivalent(a: string, b: string): boolean {
  return Boolean(normalizeName(a) && normalizeName(a) === normalizeName(b));
}

export function existingRosterMatch(
  spoken: string,
  roster: RosterName[],
): { studentId: string; displayName: string; exact: boolean } | null {
  const match = matchName(spoken, roster);
  if (!shouldAutoAttach(match) || !match.guessedStudentId) return null;
  const student = roster.find((row) => row.studentId === match.guessedStudentId);
  if (!student) return null;
  const exact = [student.displayName, ...student.aliases].some((item) =>
    namesAreEquivalent(spoken, item),
  );
  return { studentId: student.studentId, displayName: student.displayName, exact };
}
