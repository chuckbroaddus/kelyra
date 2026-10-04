/**
 * ai:dev view of Kelyra AI routing. The single source of truth is
 * supabase/functions/_shared/aiPolicy.ts (Edge imports it too); Node strips its types.
 */
export {
  CHEAP_MODEL,
  DEFAULT_MONTHLY_CAP_USD,
  FLAGSHIP_MODEL,
  GEMINI_FLASH,
  GEMINI_FLASH_LITE,
  MODEL_JPEG_QUALITY,
  MODEL_MAX_EDGE,
  PRACTICE_MODEL,
  asPass,
  estimateUsd,
  firstNameOnly,
  homeworkDraftExists,
  imageDetailFor,
  modelChainFor,
  modelFor,
  parseUsage,
  reasoningEffortFor,
} from '../../supabase/functions/_shared/aiPolicy.ts';
