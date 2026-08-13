import type { NameMatch, RosterName } from '@/lib/ai/types';
import { matchName, shouldAutoAttach } from '@/lib/matching/matchName';

export type NoteSegment = {
  text: string;
  match: NameMatch;
};

/** Split into one note per student. A new roster name starts a new note; nameless sentences stay with the previous student. */
export function splitByRoster(text: string, roster: RosterName[]): NoteSegment[] {
  const sentences = splitSentences(text);
  if (!sentences.length) return [];

  const groups: NoteSegment[] = [];
  for (const sentence of sentences) {
    const match = matchName(sentence, roster);
    const studentId = shouldAutoAttach(match) ? match.guessedStudentId : null;
    const last = groups[groups.length - 1];

    if (!last) {
      groups.push({ text: sentence, match });
      continue;
    }

    const lastId = shouldAutoAttach(last.match) ? last.match.guessedStudentId : null;
    const continuesPrevious = !studentId || studentId === lastId;
    if (continuesPrevious && (lastId || !studentId)) {
      last.text = `${last.text} ${sentence}`;
      if (studentId && !lastId) last.match = match;
      continue;
    }

    groups.push({ text: sentence, match });
  }
  return groups;
}

export function splitTranscript(text: string): string[] {
  return splitSentences(text);
}

function splitSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
