/** Keep in sync with src/lib/ai/policy.ts */

export const CHEAP_MODEL = 'grok-4.20-0309-non-reasoning';
export const FLAGSHIP_MODEL = 'grok-4.6';
export const PRACTICE_MODEL = 'grok-build-0.1';
export const MODEL_MAX_EDGE = 1280;
export const MODEL_JPEG_QUALITY = 0.72;
export const DEFAULT_MONTHLY_CAP_USD = 50;

const RATES = {
  'grok-4.6': { input: 2, output: 6 },
  'grok-4.5': { input: 2, output: 6 },
  'grok-4.3': { input: 1.25, output: 2.5 },
  'grok-4.20-0309-non-reasoning': { input: 1.25, output: 2.5 },
  'grok-4.20-0309-reasoning': { input: 1.25, output: 2.5 },
  'grok-build-0.1': { input: 1, output: 2 },
};

export function modelFor(job, pass = 'cheap') {
  if (pass === 'look-again' || job === 'look-again' || job === 'ask') return FLAGSHIP_MODEL;
  if (job === 'practice' || job === 'speech' || job === 'lesson-outline') {
    return PRACTICE_MODEL;
  }
  return CHEAP_MODEL;
}

export function imageDetailFor(pass = 'cheap') {
  return pass === 'look-again' ? 'high' : 'low';
}

export function reasoningEffortFor(model, pass = 'cheap') {
  if (model !== FLAGSHIP_MODEL) return undefined;
  return pass === 'look-again' ? 'high' : 'low';
}

export function estimateUsd(model, inputTokens, outputTokens) {
  const rate = RATES[model] ?? RATES[CHEAP_MODEL];
  const usd = (inputTokens / 1_000_000) * rate.input + (outputTokens / 1_000_000) * rate.output;
  return Math.round(usd * 10_000) / 10_000;
}

export function firstNameOnly(name) {
  return String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] ?? '';
}

export function parseUsage(payload) {
  const usage = payload?.usage ?? payload ?? {};
  const input = Number(usage.input_tokens ?? usage.prompt_tokens ?? 0) || 0;
  const output = Number(usage.output_tokens ?? usage.completion_tokens ?? 0) || 0;
  return { inputTokens: input, outputTokens: output };
}

export function asPass(value) {
  return value === 'look-again' ? 'look-again' : 'cheap';
}

export function homeworkDraftExists(draft) {
  if (!draft || typeof draft !== 'object') return false;
  if (draft.pending) return false;
  return Boolean(
    draft.gaps?.length ||
      draft.teacherNote ||
      draft.draftScore != null ||
      draft.scoreMark === 'pass' ||
      draft.scoreMark === 'fail',
  );
}
