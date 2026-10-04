/**
 * Single source of truth for Kelyra AI model routing and cost rates.
 *
 * Imported by:
 *   - Edge: supabase/functions/_shared/ai.ts (callMetered) and every AI function
 *   - Local ai:dev: scripts/lib/ai-policy.mjs re-exports this file (node strips the types)
 *   - App: src/lib/ai/policy.ts re-exports the shared constants
 * Do not copy model names or rates anywhere else.
 *
 * Routing is per job and per provider:
 *   - xai    → Grok models (ai:dev Grok OAuth, or Edge when only XAI_API_KEY is set)
 *   - gemini → Edge when GEMINI_API_KEY is set
 * Gemini jobs map to a tier: `lite` (Flash-Lite, cheap/high-volume) or `strong`
 * (Flash, for grading and answers where accuracy matters). A strong job falls back to
 * lite when the strong model is out of quota or overloaded, so a busy day degrades
 * accuracy instead of failing the teacher.
 */

export const CHEAP_MODEL = 'grok-4.20-0309-non-reasoning';
export const FLAGSHIP_MODEL = 'grok-4.6';
export const PRACTICE_MODEL = 'grok-build-0.1';
/** Gemini lite tier: classify, ingest, roster, plates, speech, practice. */
export const GEMINI_FLASH_LITE = 'gemini-3.5-flash-lite';
/** Gemini strong tier: homework grading, answer keys, Ask/explain/tutor, review, look-again. */
export const GEMINI_FLASH = 'gemini-3.8-flash';
export const DEFAULT_MONTHLY_CAP_USD = 50;
/** Client/ai:dev image prep before the model sees a photo. */
export const MODEL_MAX_EDGE = 1280;
export const MODEL_JPEG_QUALITY = 0.72;

export type AiProvider = 'gemini' | 'xai';
export type AiPass = 'cheap' | 'look-again';
export type GeminiTier = 'lite' | 'strong';
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
  | 'lesson-outline'
  | 'ride_lpr'
  | 'ingest'
  | 'interview';

/** Gemini media resolution. Mirrors xAI `detail` (low / high) for the Gemini path. */
export type MediaResolution = 'low' | 'medium' | 'high';

/**
 * Gemini tier per job. Lite where the eval scores hold up on Flash-Lite (classify,
 * ingest, roster, plates, speech intent); strong where a wrong answer becomes a wrong
 * grade or a wrong explanation to a child.
 */
export const GEMINI_JOB_TIER: Record<AiJob, GeminiTier> = {
  classify: 'lite',
  ingest: 'lite',
  interview: 'lite',
  roster: 'lite',
  ride_lpr: 'lite',
  speech: 'lite',
  practice: 'lite',
  'lesson-outline': 'lite',
  'match-key': 'lite',
  portrait: 'lite',
  homework: 'strong',
  key: 'strong',
  review: 'strong',
  ask: 'strong',
  'look-again': 'strong',
};

const RATES: Record<string, { input: number; output: number }> = {
  'grok-4.6': { input: 2, output: 6 },
  'grok-4.5': { input: 2, output: 6 },
  'grok-4.3': { input: 1.25, output: 2.5 },
  'grok-4.20-0309-non-reasoning': { input: 1.25, output: 2.5 },
  'grok-4.20-0309-reasoning': { input: 1.25, output: 2.5 },
  'grok-build-0.1': { input: 1, output: 2 },
  // Gemini Developer API list price ($/1M tokens), paid tier; free tier bills $0.
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-3.8-flash': { input: 0.75, output: 3.75 },
  'gemini-3.5-flash': { input: 1.5, output: 9 },
};

/** xAI / Grok model for a job (ai:dev and the Edge XAI_API_KEY path). */
export function modelFor(job: AiJob, pass: AiPass = 'cheap'): string {
  if (pass === 'look-again' || job === 'look-again' || job === 'ask') return FLAGSHIP_MODEL;
  if (job === 'practice' || job === 'speech' || job === 'lesson-outline') {
    return PRACTICE_MODEL;
  }
  return CHEAP_MODEL;
}

export function geminiTierFor(job: AiJob, pass: AiPass = 'cheap'): GeminiTier {
  if (pass === 'look-again') return 'strong';
  return GEMINI_JOB_TIER[job] ?? 'lite';
}

export type ModelOverrides = { geminiLite?: string | null; geminiStrong?: string | null };

/**
 * Ordered models to try for one call. First entry is the intended model; later entries
 * are fallbacks used only on quota / overload / unknown-model errors (see ai.ts callMetered).
 * Overrides come from Edge secrets KELYRA_GEMINI_LITE_MODEL / KELYRA_GEMINI_STRONG_MODEL.
 */
export function modelChainFor(
  provider: AiProvider,
  job: AiJob,
  pass: AiPass = 'cheap',
  overrides: ModelOverrides = {},
): string[] {
  if (provider === 'xai') return [modelFor(job, pass)];
  const lite = overrides.geminiLite?.trim() || GEMINI_FLASH_LITE;
  const strong = overrides.geminiStrong?.trim() || GEMINI_FLASH;
  if (geminiTierFor(job, pass) === 'strong' && strong !== lite) return [strong, lite];
  return [lite];
}

export function imageDetailFor(pass: AiPass = 'cheap'): 'low' | 'high' {
  return pass === 'look-again' ? 'high' : 'low';
}

export function reasoningEffortFor(model: string, pass: AiPass = 'cheap'): 'low' | 'high' | undefined {
  if (model !== FLAGSHIP_MODEL) return undefined;
  return pass === 'look-again' ? 'high' : 'low';
}

/**
 * Gemini image resolution per job: low (≈280 tokens) for intent classify, high for plates,
 * handwriting/grading docs and homework. An explicit `detail: 'high'` image in the payload
 * (e.g. classify-capture vehicle path) always wins. Unspecified → provider default.
 */
export function mediaResolutionFor(job: AiJob, pass: AiPass = 'cheap', payload?: unknown): MediaResolution | undefined {
  if (pass === 'look-again' || payloadWantsHighDetail(payload)) return 'high';
  if (job === 'ride_lpr' || job === 'ingest' || job === 'homework' || job === 'key' || job === 'match-key') return 'high';
  if (job === 'classify') return 'low';
  return undefined;
}

function payloadWantsHighDetail(payload: unknown, depth = 0): boolean {
  if (!payload || typeof payload !== 'object' || depth > 4) return false;
  if (Array.isArray(payload)) return payload.some((item) => payloadWantsHighDetail(item, depth + 1));
  const row = payload as { type?: unknown; detail?: unknown; content?: unknown };
  if (row.type === 'input_image' && row.detail === 'high') return true;
  return payloadWantsHighDetail(row.content, depth + 1);
}

/** Per-call model timeout (ms). One retry may follow, so worst case is about 2x. */
export function modelTimeoutMsFor(job: AiJob, pass: AiPass = 'cheap'): number {
  if (pass === 'look-again') return 60_000;
  switch (job) {
    case 'ingest':
    case 'lesson-outline':
      return 45_000;
    case 'homework':
    case 'review':
    case 'ask':
      return 30_000;
    case 'interview':
      return 15_000;
    default:
      return 20_000;
  }
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
  const usage = (payload?.usage ?? payload?.usageMetadata ?? payload) as
    | Record<string, unknown>
    | undefined;
  const input =
    Number(
      usage?.input_tokens ??
        usage?.prompt_tokens ??
        usage?.prompt_text_tokens ??
        usage?.promptTokenCount ??
        usage?.prompt_token_count ??
        0,
    ) || 0;
  const output =
    Number(
      usage?.output_tokens ??
        usage?.completion_tokens ??
        usage?.completion_text_tokens ??
        usage?.candidatesTokenCount ??
        usage?.candidates_token_count ??
        0,
    ) || 0;
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
