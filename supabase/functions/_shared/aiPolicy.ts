/** Keep in sync with src/lib/ai/policy.ts and scripts/lib/ai-policy.mjs. */

export const CHEAP_MODEL = 'grok-4.20-0309-non-reasoning';
export const FLAGSHIP_MODEL = 'grok-4.6';
export const PRACTICE_MODEL = 'grok-build-0.1';
export const DEFAULT_MONTHLY_CAP_USD = 50;

export type AiPass = 'cheap' | 'look-again';
export type AiJob =
  | 'classify'
  | 'homework'
  | 'practice'
  | 'review'
  | 'ask'
  | 'look-again'
  | 'roster'
  | 'key'
  | 'match-key'
  | 'speech'
  | 'portrait'
  | 'lesson-outline';

const RATES: Record<string, { input: number; output: number }> = {
  'grok-4.6': { input: 2, output: 6 },
  'grok-4.5': { input: 2, output: 6 },
  'grok-4.3': { input: 1.25, output: 2.5 },
  'grok-4.20-0309-non-reasoning': { input: 1.25, output: 2.5 },
  'grok-4.20-0309-reasoning': { input: 1.25, output: 2.5 },
  'grok-build-0.1': { input: 1, output: 2 },
};

export function modelFor(job: AiJob, pass: AiPass = 'cheap'): string {
  if (pass === 'look-again' || job === 'look-again' || job === 'ask') return FLAGSHIP_MODEL;
  if (job === 'practice' || job === 'speech' || job === 'lesson-outline') {
    return PRACTICE_MODEL;
  }
  return CHEAP_MODEL;
}

export function imageDetailFor(pass: AiPass = 'cheap'): 'low' | 'high' {
  return pass === 'look-again' ? 'high' : 'low';
}

export function reasoningEffortFor(model: string, pass: AiPass = 'cheap'): 'low' | 'high' | undefined {
  if (model !== FLAGSHIP_MODEL) return undefined;
  return pass === 'look-again' ? 'high' : 'low';
}

export function estimateUsd(model: string, inputTokens: number, outputTokens: number): number {
  const rate = RATES[model] ?? RATES[CHEAP_MODEL]!;
  const usd = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return Math.round(usd * 10_000) / 10_000;
}

export function firstNameOnly(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? '';
}

export function parseUsage(payload: Record<string, unknown> | null | undefined): {
  inputTokens: number;
  outputTokens: number;
} {
  const usage = (payload?.usage ?? payload) as Record<string, unknown> | undefined;
  const input = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0) || 0;
  const output = Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0) || 0;
  return { inputTokens: input, outputTokens: output };
}

export function asPass(value: unknown): AiPass {
  return value === 'look-again' ? 'look-again' : 'cheap';
}

export function homeworkDraftExists(draft: unknown): boolean {
  if (!draft || typeof draft !== 'object') return false;
  const row = draft as {
    gaps?: unknown[];
    teacherNote?: string | null;
    draftScore?: number | null;
    scoreMark?: string;
    pending?: boolean;
  };
  if (row.pending) return false;
  return Boolean(
    row.gaps?.length ||
      row.teacherNote ||
      row.draftScore != null ||
      row.scoreMark === 'pass' ||
      row.scoreMark === 'fail',
  );
}
