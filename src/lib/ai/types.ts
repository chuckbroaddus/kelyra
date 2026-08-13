/**
 * Server-side AI adapter contract.
 * Implementation lives in supabase/functions/_shared/ai.ts — not in the Expo bundle.
 */

export type RosterName = {
  studentId: string;
  displayName: string;
  aliases: string[];
};

export type NameMatch = {
  guessedStudentId: string | null;
  confidence: number;
};

export type DraftGap = {
  label: string;
  sortOrder: number;
};

export type HomeworkDraft = {
  gaps: DraftGap[];
  draftScore: number | null;
  teacherNote: string | null;
  parentSentence: string | null;
};

export type PracticeItem = {
  id: string;
  prompt: string;
  answerKey?: string;
};

export type PracticeDraft = {
  items: PracticeItem[];
};

export type AiAdapter = {
  transcribe(audio: Blob | ArrayBuffer): Promise<string>;
  readImage(image: Blob | ArrayBuffer, prompt: string): Promise<string>;
  matchName(transcript: string, roster: RosterName[]): Promise<NameMatch>;
  draftGaps(image: Blob | ArrayBuffer, hint: string | null): Promise<HomeworkDraft>;
  generatePractice(
    skillLabel: string,
    context: { teacherPrompt?: string; captureId?: string },
  ): Promise<PracticeDraft>;
};
