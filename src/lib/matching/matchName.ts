import type { NameMatch, RosterName } from '@/lib/ai/types';

const AUTO_ATTACH_MIN = 0.8;

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function shouldAutoAttach(match: NameMatch): boolean {
  return Boolean(match.guessedStudentId) && match.confidence >= AUTO_ATTACH_MIN;
}

const SKIP = new Set(['name', 'student', 'date', 'grade', 'class', 'homework', 'assignment', 'the', 'and']);

/** Match a name read off a worksheet to the roster. First name is enough if unique. */
export function matchPaperName(visible: string, roster: RosterName[]): NameMatch {
  const direct = matchName(visible, roster);
  if (direct.guessedStudentId && direct.confidence >= 0.8) return direct;
  const tokens = normalizeName(visible)
    .split(' ')
    .filter((token) => token.length > 2 && !SKIP.has(token));
  for (const token of tokens) {
    const part = matchName(token, roster);
    if (part.guessedStudentId && part.confidence >= 0.85) return part;
  }
  const hay = normalizeName(visible);
  const hits = roster.filter((student) => {
    const parts = [student.displayName, ...student.aliases].map(normalizeName).filter(Boolean);
    return parts.some((name) => name.split(' ').some((part) => part.length > 2 && hay.includes(part)));
  });
  if (hits.length === 1) return { guessedStudentId: hits[0]!.studentId, confidence: 0.86 };
  return direct;
}

export function matchName(transcript: string, roster: RosterName[]): NameMatch {
  const spoken = normalizeName(transcript);
  if (!spoken || roster.length === 0) {
    return { guessedStudentId: null, confidence: 0 };
  }

  const scored = roster.map((student) => ({
    studentId: student.studentId,
    score: scoreStudent(spoken, student),
  }));

  const best = Math.max(...scored.map((row) => row.score));
  if (best <= 0) {
    return { guessedStudentId: null, confidence: 0 };
  }

  const winners = scored.filter((row) => row.score === best);
  if (winners.length !== 1) {
    return { guessedStudentId: null, confidence: Math.min(best, 0.4) };
  }

  return { guessedStudentId: winners[0].studentId, confidence: best };
}

function scoreStudent(spoken: string, student: RosterName): number {
  const names = [student.displayName, ...student.aliases]
    .map(normalizeName)
    .filter(Boolean);

  let best = 0;
  for (const name of names) {
    if (!name) continue;
    if (hasPhrase(spoken, name)) {
      best = Math.max(best, name.includes(' ') ? 1 : 0.9);
      continue;
    }
    const first = name.split(' ')[0];
    if (first && hasPhrase(spoken, first)) {
      best = Math.max(best, 0.85);
    }
  }
  return best;
}

function hasPhrase(haystack: string, needle: string): boolean {
  return new RegExp(`(^| )${escapeRegExp(needle)}( |$)`).test(haystack);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
