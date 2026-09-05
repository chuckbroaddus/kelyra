import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

test('Edge ai.ts prefers GEMINI_API_KEY → Flash-Lite; keeps xAI path', () => {
  const ai = read('supabase/functions/_shared/ai.ts');
  const policy = read('supabase/functions/_shared/aiPolicy.ts');

  assert.match(ai, /GEMINI_API_KEY/);
  assert.match(ai, /resolveAiProvider/);
  assert.match(ai, /geminiGenerate/);
  assert.match(ai, /generativelanguage\.googleapis\.com/);
  assert.match(policy, /GEMINI_FLASH_LITE\s*=\s*'gemini-3\.5-flash-lite'/);
  assert.match(policy, /'gemini-3\.5-flash-lite'\s*:\s*\{\s*input:\s*0\.3,\s*output:\s*2\.5/);

  assert.match(ai, /function requireXaiKey/);
  assert.match(ai, /GEMINI_API_KEY or XAI_API_KEY is not set/);
  assert.doesNotMatch(
    ai.slice(ai.indexOf('export function requireXaiKey'), ai.indexOf('export async function xaiResponses')),
    /throw new Error\('XAI_API_KEY is not set'\)/,
  );

  assert.match(ai, /provider === 'gemini'\s*\?\s*GEMINI_FLASH_LITE/);
  assert.match(ai, /xaiResponses/);
  assert.match(ai, /functionCalls|functionDeclarations/);
});

test('Edge text/vision callers use requireXaiKey; analyze-homework no longer hard-requires XAI only', () => {
  const files = [
    'supabase/functions/ask-assistant/index.ts',
    'supabase/functions/classify-capture/index.ts',
    'supabase/functions/generate-practice/index.ts',
    'supabase/functions/review-submission/index.ts',
    'supabase/functions/build-practice-lesson/index.ts',
    'supabase/functions/analyze-homework/index.ts',
  ];
  for (const rel of files) {
    const src = read(rel);
    assert.match(src, /requireXaiKey/, `${rel} should call requireXaiKey`);
    assert.doesNotMatch(
      src,
      /Deno\.env\.get\('XAI_API_KEY'\)/,
      `${rel} must not read XAI_API_KEY directly for text/vision`,
    );
  }
});

test('STT stays on xAI; local ai:dev stays Grok OAuth', () => {
  const transcribe = read('supabase/functions/transcribe/index.ts');
  assert.match(transcribe, /XAI_API_KEY/);
  assert.match(transcribe, /\/stt/);
  assert.doesNotMatch(transcribe, /GEMINI_API_KEY|geminiGenerate|generativelanguage/);

  const ai = read('supabase/functions/_shared/ai.ts');
  assert.match(ai, /Speech-to-text stays on xAI|do not route STT/i);

  const dev = read('scripts/ai-dev-server.mjs');
  assert.doesNotMatch(dev, /GEMINI_API_KEY|gemini-3\.5-flash-lite|generativelanguage\.googleapis/);
  assert.match(dev, /auth\.json|grok/i);
});

test('Gemini path maps Ask function_call / function_call_output history for multi-round tools', () => {
  const ai = read('supabase/functions/_shared/ai.ts');
  const mapperAt = ai.indexOf('export async function geminiContentsFromInput');
  assert.ok(mapperAt > 0, 'geminiContentsFromInput must exist');
  const mapperEnd = Math.max(
    ai.indexOf('const GEMINI_SCHEMA_DROP', mapperAt),
    ai.indexOf('export function sanitizeGeminiSchema', mapperAt),
  );
  const mapper = ai.slice(mapperAt, mapperEnd > mapperAt ? mapperEnd : ai.indexOf('export function geminiToolsFromExtra', mapperAt));

  assert.match(mapper, /function_call/);
  assert.match(mapper, /function_call_output/);
  assert.match(mapper, /functionCall/);
  assert.match(mapper, /functionResponse/);
  assert.match(mapper, /callNames/);
  assert.match(mapper, /call_id/);

  const callAt = mapper.indexOf("type === 'function_call'");
  const outAt = mapper.indexOf("type === 'function_call_output'");
  assert.ok(callAt > 0 && outAt > callAt, 'map function_call before function_call_output');

  // Parallel tools: coalesce consecutive FC/FR into one model + one user content.
  assert.match(mapper, /appendPart/);
  assert.match(mapper, /Coalesce consecutive function_call/);
  assert.match(mapper, /Coalesce consecutive function_call_output/);

  // askAgent must emit all function_calls before outputs (not FC/FR interleaved).
  const agent = read('src/lib/ai/askAgent.ts');
  assert.match(agent, /type:\s*'function_call'/);
  assert.match(agent, /type:\s*'function_call_output'/);
  const toolBlockAt = agent.indexOf('if (reply.toolCalls?.length)');
  assert.ok(toolBlockAt > 0);
  const toolBlock = agent.slice(toolBlockAt, agent.indexOf('const text = reply.text', toolBlockAt));
  const firstFcPush = toolBlock.indexOf("type: 'function_call'");
  const firstOutPush = toolBlock.indexOf("type: 'function_call_output'");
  const secondLoop = toolBlock.indexOf('for (const call of reply.toolCalls)', toolBlock.indexOf('for (const call of reply.toolCalls)') + 1);
  assert.ok(firstFcPush > 0 && firstOutPush > firstFcPush);
  assert.ok(secondLoop > 0 && secondLoop < firstOutPush, 'outputs must be in a second loop after all function_calls are pushed');
});

test('Gemini inlineImagePart uses isAllowedAskImageUrl before fetch (SSRF)', () => {
  const ai = read('supabase/functions/_shared/ai.ts');
  assert.match(ai, /from '\.\/askImageUrl\.ts'/);
  assert.match(ai, /isAllowedAskImageUrl/);

  const inlineAt = ai.indexOf('async function inlineImagePart');
  assert.ok(inlineAt > 0);
  const inline = ai.slice(inlineAt, ai.indexOf('function parseJsonObject', inlineAt));
  const allowAt = inline.indexOf('isAllowedAskImageUrl(imageUrl)');
  const fetchAt = inline.indexOf('await fetch(imageUrl');
  assert.ok(allowAt > 0, 'inlineImagePart must call isAllowedAskImageUrl');
  assert.ok(fetchAt > allowAt, 'allowlist must run before fetch');
  assert.match(inline, /Image URL is not allowed/);
});

test('Gemini tool mapping strips additionalProperties from Ask-shaped parameter schemas', () => {
  const ai = read('supabase/functions/_shared/ai.ts');
  assert.match(ai, /export function sanitizeGeminiSchema/);
  assert.match(ai, /GEMINI_SCHEMA_DROP/);
  assert.match(ai, /additionalProperties/);

  const toolsAt = ai.indexOf('export function geminiToolsFromExtra');
  assert.ok(toolsAt > 0);
  const toolsBlock = ai.slice(toolsAt, ai.indexOf('function normalizeGeminiResponse', toolsAt));
  assert.match(toolsBlock, /sanitizeGeminiSchema\(rawParams\)/);

  // Ask defs always set additionalProperties: false — must not reach Gemini as-is.
  const askTools = read('src/lib/ai/askTools.ts');
  assert.match(askTools, /additionalProperties:\s*false/);
});

test('Gemini Ask loop preserves thoughtSignature on function_call history', () => {
  const ai = read('supabase/functions/_shared/ai.ts');

  const normalizeAt = ai.indexOf('function normalizeGeminiResponse');
  const normalize = ai.slice(normalizeAt, ai.indexOf('export async function geminiGenerate', normalizeAt));
  assert.match(normalize, /thoughtSignature/);
  assert.match(normalize, /thoughtSignatureOf\(part\)/);

  const mapperAt = ai.indexOf('export async function geminiContentsFromInput');
  const mapper = ai.slice(mapperAt, ai.indexOf('const GEMINI_SCHEMA_DROP', mapperAt) > mapperAt
    ? ai.indexOf('const GEMINI_SCHEMA_DROP', mapperAt)
    : ai.indexOf('export function sanitizeGeminiSchema', mapperAt));
  // Fallback slice if layout differs: ensure remapper echoes signature onto the part.
  const mapperFull = ai.slice(mapperAt, ai.indexOf('export function sanitizeGeminiSchema', mapperAt));
  const body = mapper.includes('function_call') ? mapper : mapperFull;
  assert.match(body, /thoughtSignature/);
  assert.match(body, /part\.thoughtSignature\s*=\s*thoughtSignature/);

  const fnCallsAt = ai.indexOf('export function functionCalls');
  const fnCalls = ai.slice(fnCallsAt, ai.indexOf('export function outputText', fnCallsAt));
  assert.match(fnCalls, /thoughtSignature/);

  const agent = read('src/lib/ai/askAgent.ts');
  assert.match(agent, /thoughtSignature\?:/);
  assert.match(agent, /call\.thoughtSignature\s*\?\s*\{\s*thoughtSignature:\s*call\.thoughtSignature/);
});

test('T28: geminiGenerate accepts responseMimeType into generationConfig', () => {
  const ai = read('supabase/functions/_shared/ai.ts');
  const genAt = ai.indexOf('export async function geminiGenerate');
  assert.ok(genAt > 0);
  const gen = ai.slice(genAt, ai.indexOf('export type FunctionCall', genAt));
  assert.match(gen, /responseMimeType/);
  assert.match(gen, /response_mime_type/);
  assert.match(gen, /generationConfig\.responseMimeType\s*=\s*mime/);
  // max tokens and mime share one generationConfig object
  assert.match(gen, /const generationConfig: Record<string, unknown> = \{\}/);
  assert.match(gen, /generationConfig\.maxOutputTokens/);
});

test('T28: ingest-lesson-pack requests application/json mime; keeps stamp validation', () => {
  const ingest = read('supabase/functions/ingest-lesson-pack/index.ts');
  assert.match(ingest, /responseMimeType:\s*'application\/json'/);
  assert.match(ingest, /validateDraft\(draft\)/);
  assert.match(ingest, /model returned markdown; JSON only required/);
});

