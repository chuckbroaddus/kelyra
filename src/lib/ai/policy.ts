/**
 * Cost routing for Grok calls. Keep in sync with
 * supabase/functions/_shared/aiPolicy.ts and scripts/lib/ai-policy.mjs.
 *
 * Cheap default is the lowest-price vision model on the current xAI key.
 * Flagship is only Ask and an explicit Look-again pass.
 */

export const CHEAP_MODEL = 'grok-4.20-0309-non-reasoning';
export const FLAGSHIP_MODEL = 'grok-4.6';
export const PRACTICE_MODEL = 'grok-build-0.1';

export const MODEL_MAX_EDGE = 1280;
export const MODEL_JPEG_QUALITY = 0.72;
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

export function reasoningEffortFor(model: string, pass: AiPass = 'cheap'): 'low' | 'high' | null {
  if (model !== FLAGSHIP_MODEL) return null;
  return pass === 'look-again' ? 'high' : 'low';
}

export function estimateUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = RATES[model] ?? RATES[CHEAP_MODEL]!;
  const usd = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return Math.round(usd * 10_000) / 10_000;
}

export function formatUsd(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return '';
  if (usd < 0.01) return `~$${(Math.max(usd, 0.001)).toFixed(3)}`;
  return `~$${usd.toFixed(2)}`;
}

export function firstNameOnly(name: string): string {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? '';
}

export function rosterForModel(
  rows: Array<{ id?: string; name?: string; display_name?: string }>,
): Array<{ id: string; name: string }> {
  return rows
    .map((row) => ({
      id: String(row.id ?? ''),
      name: firstNameOnly(String(row.name ?? row.display_name ?? '')),
    }))
    .filter((row) => row.id && row.name);
}

export function shouldSkipHomeworkAnalyze(input: {
  pass?: AiPass | string | null;
  hasDraft?: boolean;
}): boolean {
  const pass = input.pass === 'look-again' ? 'look-again' : 'cheap';
  return pass !== 'look-again' && Boolean(input.hasDraft);
}

export function parseUsage(payload: Record<string, unknown> | null | undefined): {
  inputTokens: number;
  outputTokens: number;
} {
  const usage = (payload?.usage ?? payload) as Record<string, unknown> | undefined;
  const input =
    Number(usage?.input_tokens ?? usage?.prompt_tokens ?? usage?.prompt_text_tokens ?? 0) || 0;
  const output =
    Number(usage?.output_tokens ?? usage?.completion_tokens ?? usage?.completion_text_tokens ?? 0) || 0;
  return { inputTokens: input, outputTokens: output };
}
