/**
 * App-side view of Kelyra AI routing. Model names, job tiers and rates live in ONE
 * place: supabase/functions/_shared/aiPolicy.ts (also used by Edge and ai:dev).
 * Only app-only helpers (formatting, roster shaping) are defined here.
 */

export {
  CHEAP_MODEL,
  DEFAULT_MONTHLY_CAP_USD,
  FLAGSHIP_MODEL,
  GEMINI_FLASH,
  GEMINI_FLASH_LITE,
  GEMINI_JOB_TIER,
  MODEL_JPEG_QUALITY,
  MODEL_MAX_EDGE,
  PRACTICE_MODEL,
  estimateUsd,
  firstNameOnly,
  geminiTierFor,
  imageDetailFor,
  modelChainFor,
  modelFor,
  parseUsage,
  reasoningEffortFor,
} from '../../../supabase/functions/_shared/aiPolicy.ts';
export type {
  AiJob,
  AiPass,
  AiProvider,
  GeminiTier,
  MediaResolution,
} from '../../../supabase/functions/_shared/aiPolicy.ts';

import { firstNameOnly, type AiPass } from '../../../supabase/functions/_shared/aiPolicy.ts';

export function formatUsd(usd: number | null | undefined): string {
  if (usd == null || !Number.isFinite(usd)) return '';
  if (usd < 0.01) return `~$${(Math.max(usd, 0.001)).toFixed(3)}`;
  return `~$${usd.toFixed(2)}`;
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
