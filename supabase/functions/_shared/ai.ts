/**
 * Edge AI adapter (text / vision). Never ship model keys in the Expo app.
 *
 * Prefer GEMINI_API_KEY → Gemini (per-job tier from aiPolicy.ts). Else XAI_API_KEY → xAI Responses.
 * Local development uses Grok CLI OAuth instead — see scripts/ai-dev-server.mjs.
 * Speech-to-text stays on xAI (transcribe/); do not route STT here.
 */

import {
  DEFAULT_MONTHLY_CAP_USD,
  FLAGSHIP_MODEL,
  PRACTICE_MODEL,
  estimateUsd,
  mediaResolutionFor,
  modelChainFor,
  modelFor,
  modelTimeoutMsFor,
  parseUsage,
  reasoningEffortFor,
  type AiJob,
  type AiPass,
  type MediaResolution,
} from './aiPolicy.ts';
import { isAllowedAskImageUrl } from './askImageUrl.ts';

export const xaiBaseUrl = 'https://api.x.ai/v1';
export const geminiBaseUrl = 'https://generativelanguage.googleapis.com/v1beta';
export const defaultVisionModel = FLAGSHIP_MODEL;
export const cheapVisionModel = modelFor('homework');
export const cheapTextModel = PRACTICE_MODEL;

export type AiProvider = 'gemini' | 'xai';

/** Prefer Gemini when GEMINI_API_KEY is set; else xAI. */
export function resolveAiProvider(): AiProvider {
  if (Deno.env.get('GEMINI_API_KEY')) return 'gemini';
  if (Deno.env.get('XAI_API_KEY')) return 'xai';
  throw new Error('GEMINI_API_KEY or XAI_API_KEY is not set');
}




/**
 * Text/vision key for Edge jobs. Prefer GEMINI_API_KEY; fall back to XAI_API_KEY.
 * Name kept for callers; STT must still read XAI_API_KEY directly.
 */
export function requireXaiKey(): string {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) return gemini;
  const xai = Deno.env.get('XAI_API_KEY');
  if (xai) return xai;
  throw new Error('GEMINI_API_KEY or XAI_API_KEY is not set');
}

/** Provider error with the HTTP status, so callers can retry / fall back on 429 / 5xx. */
export class AiProviderError extends Error {
  readonly status: number;
  readonly provider: AiProvider;
  constructor(message: string, status: number, provider: AiProvider) {
    super(message);
    this.status = status;
    this.provider = provider;
  }
}

/** Keys on `extra` that only steer this adapter; never forwarded raw to a vendor. */
const ADAPTER_ONLY_KEYS = new Set([
  'mediaResolution',
  'jsonSchema',
  'schemaName',
  'responseMimeType',
  'response_mime_type',
  'maxOutputTokens',
  'timeoutMs',
]);

function xaiBody(model: string, input: unknown, extra: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = { store: false, model, input };
  for (const [key, value] of Object.entries(extra)) {
    if (!ADAPTER_ONLY_KEYS.has(key)) body[key] = value;
  }
  const maxOut = Number(extra.max_output_tokens ?? extra.maxOutputTokens);
  if (Number.isFinite(maxOut) && maxOut > 0) body.max_output_tokens = Math.round(maxOut);
  const schema = extra.jsonSchema;
  if (schema && typeof schema === 'object' && !body.tools) {
    body.text = {
      format: {
        type: 'json_schema',
        name: String(extra.schemaName ?? 'result'),
        schema,
        strict: false,
      },
    };
  }
  return body;
}

export async function xaiResponses(
  apiKey: string,
  model: string,
  input: unknown,
  extra: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${xaiBaseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(xaiBody(model, input, extra)),
    signal,
  });
  if (!response.ok) {
    throw new AiProviderError(`Grok failed: ${response.status} ${await response.text()}`, response.status, 'xai');
  }
  return (await response.json()) as Record<string, unknown>;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const IMAGE_CACHE_TTL_MS = 120_000;
const IMAGE_CACHE_MAX = 32;
/** Per-isolate cache so a retry / second pass never re-downloads + re-encodes the same page. */
const imagePartCache = new Map<string, { at: number; part: Promise<Record<string, unknown>> }>();

function cachedImagePart(
  imageUrl: string,
  load: () => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const now = Date.now();
  const hit = imagePartCache.get(imageUrl);
  if (hit && now - hit.at < IMAGE_CACHE_TTL_MS) return hit.part;
  const part = load();
  imagePartCache.set(imageUrl, { at: now, part });
  part.catch(() => imagePartCache.delete(imageUrl));
  while (imagePartCache.size > IMAGE_CACHE_MAX) {
    const oldest = imagePartCache.keys().next().value;
    if (oldest === undefined) break;
    imagePartCache.delete(oldest);
  }
  return part;
}

async function inlineImagePart(imageUrl: string): Promise<Record<string, unknown>> {
  // Same SSRF allowlist as Ask hydrate: data: or this project's storage https only.
  if (!isAllowedAskImageUrl(imageUrl)) {
    throw new Error('Image URL is not allowed');
  }
  const dataUrl = imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUrl) {
    return { inlineData: { mimeType: dataUrl[1] || 'image/jpeg', data: dataUrl[2] } };
  }
  return await cachedImagePart(imageUrl, async () => {
    const response = await fetch(imageUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Could not fetch image for Gemini: ${response.status}`);
    }
    const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { inlineData: { mimeType: mime, data: bytesToBase64(bytes) } };
  });
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return { result: parsed };
    } catch {
      return { result: raw };
    }
  }
  return { result: raw ?? null };
}

async function contentPartsFromXai(
  content: unknown,
): Promise<Array<Record<string, unknown>>> {
  if (typeof content === 'string') {
    return content.trim() ? [{ text: content }] : [];
  }
  if (!Array.isArray(content)) {
    if (content && typeof content === 'object') {
      const row = content as { type?: string; text?: string; image_url?: string };
      if (row.type === 'input_image' && typeof row.image_url === 'string') {
        return [await inlineImagePart(row.image_url)];
      }
      if (typeof row.text === 'string' && row.text.trim()) return [{ text: row.text }];
    }
    return [];
  }
  // Download every page at once (order preserved) — never one image after another.
  const pending: Array<Promise<Record<string, unknown> | null>> = [];
  for (const item of content) {
    const row = item as { type?: string; text?: string; image_url?: string };
    if (!row || typeof row !== 'object') continue;
    if (row.type === 'input_image' && typeof row.image_url === 'string') {
      pending.push(inlineImagePart(row.image_url));
      continue;
    }
    if (row.type === 'input_text' || row.type === 'text' || typeof row.text === 'string') {
      const text = String(row.text ?? '').trim();
      if (text) pending.push(Promise.resolve({ text }));
    }
  }
  return (await Promise.all(pending)).filter((part): part is Record<string, unknown> => Boolean(part));
}

/** Exported for static/regression coverage of Ask multi-round tool mapping. */
export async function geminiContentsFromInput(
  input: unknown,
): Promise<Array<Record<string, unknown>>> {
  if (typeof input === 'string') {
    return [{ role: 'user', parts: [{ text: input }] }];
  }
  if (!Array.isArray(input)) {
    const parts = await contentPartsFromXai(input);
    return parts.length ? [{ role: 'user', parts }] : [{ role: 'user', parts: [{ text: String(input ?? '') }] }];
  }
  const contents: Array<Record<string, unknown>> = [];
  const callNames = new Map<string, string>();

  const appendPart = (role: 'model' | 'user', part: Record<string, unknown>) => {
    const last = contents[contents.length - 1] as
      | { role?: string; parts?: Array<Record<string, unknown>> }
      | undefined;
    if (last && last.role === role && Array.isArray(last.parts)) {
      last.parts.push(part);
      return;
    }
    contents.push({ role, parts: [part] });
  };

  for (const item of input) {
    if (typeof item === 'string') {
      if (item.trim()) contents.push({ role: 'user', parts: [{ text: item }] });
      continue;
    }
    const row = item as {
      role?: string;
      content?: unknown;
      type?: string;
      call_id?: string;
      id?: string;
      name?: string;
      arguments?: unknown;
      args?: unknown;
      output?: unknown;
      thoughtSignature?: unknown;
      thought_signature?: unknown;
    };
    if (!row || typeof row !== 'object') continue;

    const type = String(row.type ?? '');
    if (type === 'function_call' || type === 'tool_call') {
      const callId = String(row.call_id ?? row.id ?? '');
      const name = String(row.name ?? '').trim();
      if (!name) continue;
      if (callId) callNames.set(callId, name);
      const functionCall: Record<string, unknown> = {
        name,
        args: parseJsonObject(row.arguments ?? row.args ?? {}),
      };
      if (callId) functionCall.id = callId;
      const part: Record<string, unknown> = { functionCall };
      const thoughtSignature = thoughtSignatureOf(row);
      if (thoughtSignature) part.thoughtSignature = thoughtSignature;
      // Coalesce consecutive function_call items into one model turn (parallel tools).
      appendPart('model', part);
      continue;
    }
    if (type === 'function_call_output' || type === 'tool_result') {
      const callId = String(row.call_id ?? row.id ?? '');
      const name =
        (callId && callNames.get(callId)) ||
        String(row.name ?? '').trim() ||
        'tool';
      const functionResponse: Record<string, unknown> = {
        name,
        response: parseJsonObject(row.output),
      };
      if (callId) functionResponse.id = callId;
      // Coalesce consecutive function_call_output items into one user turn.
      appendPart('user', { functionResponse });
      continue;
    }

    const role = row.role === 'assistant' || row.role === 'model' ? 'model' : 'user';
    const parts = await contentPartsFromXai(row.content);
    if (parts.length) contents.push({ role, parts });
  }
  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
  return contents;
}

/** JSON Schema keywords Gemini functionDeclarations Schema rejects. */
const GEMINI_SCHEMA_DROP = new Set([
  'additionalProperties',
  'additional_properties',
  '$schema',
  '$id',
  '$ref',
  '$defs',
  'definitions',
  'const',
  'if',
  'then',
  'else',
  'not',
  'dependentRequired',
  'dependentSchemas',
  'patternProperties',
  'unevaluatedProperties',
  'unevaluatedItems',
  'prefixItems',
]);

/** Strip unsupported JSON Schema fields before Gemini functionDeclarations. */
export function sanitizeGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sanitizeGeminiSchema(item));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (GEMINI_SCHEMA_DROP.has(key)) continue;
    out[key] = sanitizeGeminiSchema(child);
  }
  return out;
}

function thoughtSignatureOf(row: Record<string, unknown> | null | undefined): string | undefined {
  if (!row) return undefined;
  if (typeof row.thoughtSignature === 'string' && row.thoughtSignature) return row.thoughtSignature;
  if (typeof row.thought_signature === 'string' && row.thought_signature) return row.thought_signature;
  return undefined;
}

export function geminiToolsFromExtra(extra: Record<string, unknown>): Record<string, unknown>[] | undefined {
  const tools = extra.tools;
  if (!Array.isArray(tools) || !tools.length) return undefined;
  const declarations = tools
    .map((tool) => {
      const row = tool as {
        type?: string;
        name?: string;
        description?: string;
        parameters?: Record<string, unknown>;
        function?: { name?: string; description?: string; parameters?: Record<string, unknown> };
      };
      const fn = row.function ?? row;
      const name = String(fn.name ?? row.name ?? '').trim();
      if (!name) return null;
      const rawParams = (fn.parameters ?? row.parameters ?? { type: 'object', properties: {} }) as Record<
        string,
        unknown
      >;
      return {
        name,
        description: String(fn.description ?? row.description ?? name),
        parameters: sanitizeGeminiSchema(rawParams) as Record<string, unknown>,
      };
    })
    .filter(Boolean);
  if (!declarations.length) return undefined;
  return [{ functionDeclarations: declarations }];
}

function normalizeGeminiResponse(raw: Record<string, unknown>): Record<string, unknown> {
  const usageMeta = (raw.usageMetadata ?? {}) as Record<string, unknown>;
  const candidates = Array.isArray(raw.candidates) ? (raw.candidates as Array<Record<string, unknown>>) : [];
  const parts =
    ((candidates[0]?.content as { parts?: Array<Record<string, unknown>> } | undefined)?.parts) ?? [];
  const textChunks: string[] = [];
  const output: Array<Record<string, unknown>> = [];
  let callIndex = 0;
  for (const part of parts) {
    if (typeof part.text === 'string' && part.text) {
      textChunks.push(part.text);
      output.push({ type: 'message', content: [{ type: 'output_text', text: part.text }] });
      continue;
    }
    const call = (part.functionCall ?? part.function_call) as
      | { name?: string; args?: unknown; arguments?: unknown; id?: string }
      | undefined;
    if (call?.name) {
      const args = call.args ?? call.arguments ?? {};
      callIndex += 1;
      const thoughtSignature = thoughtSignatureOf(part);
      const callId =
        typeof call.id === 'string' && call.id.trim() ? String(call.id) : `gemini_call_${callIndex}`;
      output.push({
        type: 'function_call',
        call_id: callId,
        name: String(call.name),
        arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
        ...(thoughtSignature ? { thoughtSignature } : {}),
      });
    }
  }
  const outputTextJoined = textChunks.join('');
  return {
    ...raw,
    output_text: outputTextJoined,
    output,
    usage: {
      input_tokens: Number(usageMeta.promptTokenCount ?? usageMeta.prompt_token_count ?? 0) || 0,
      output_tokens:
        Number(usageMeta.candidatesTokenCount ?? usageMeta.candidates_token_count ?? 0) || 0,
    },
  };
}

const GEMINI_MEDIA_RESOLUTION: Record<MediaResolution, string> = {
  low: 'MEDIA_RESOLUTION_LOW',
  medium: 'MEDIA_RESOLUTION_MEDIUM',
  high: 'MEDIA_RESOLUTION_HIGH',
};

export async function geminiGenerate(
  apiKey: string,
  model: string,
  input: unknown,
  extra: Record<string, unknown> = {},
  signal?: AbortSignal,
  onText?: (delta: string) => void,
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    contents: await geminiContentsFromInput(input),
  };
  if (typeof extra.instructions === 'string' && extra.instructions.trim()) {
    body.systemInstruction = { parts: [{ text: extra.instructions.trim() }] };
  }
  const tools = geminiToolsFromExtra(extra);
  if (tools) body.tools = tools;
  const generationConfig: Record<string, unknown> = {};
  const maxOut = Number(extra.max_output_tokens ?? extra.maxOutputTokens);
  if (Number.isFinite(maxOut) && maxOut > 0) {
    generationConfig.maxOutputTokens = Math.round(maxOut);
  }
  const mime =
    typeof extra.responseMimeType === 'string'
      ? extra.responseMimeType.trim()
      : typeof extra.response_mime_type === 'string'
        ? extra.response_mime_type.trim()
        : '';
  if (mime) generationConfig.responseMimeType = mime;
  const schema = extra.jsonSchema;
  if (schema && typeof schema === 'object' && !tools) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseJsonSchema = schema;
  }
  const resolution = GEMINI_MEDIA_RESOLUTION[extra.mediaResolution as MediaResolution];
  if (resolution) generationConfig.mediaResolution = resolution;
  if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;
  const method = onText ? 'streamGenerateContent?alt=sse' : 'generateContent';
  const response = await fetch(
    `${geminiBaseUrl}/models/${encodeURIComponent(model)}:${method}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal,
    },
  );
  if (!response.ok) {
    throw new AiProviderError(
      `Gemini failed: ${response.status} ${await response.text()}`,
      response.status,
      'gemini',
    );
  }
  if (onText && response.body) return await readGeminiStream(response.body, onText);
  return normalizeGeminiResponse((await response.json()) as Record<string, unknown>);
}

/**
 * Gemini SSE (`streamGenerateContent?alt=sse`): forward text deltas as they arrive and fold every
 * chunk back into one generateContent-shaped response (text merged, function calls +
 * thoughtSignatures kept) so callers see the same payload as the non-stream path.
 */
async function readGeminiStream(
  body: ReadableStream<Uint8Array>,
  onText: (delta: string) => void,
): Promise<Record<string, unknown>> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  const parts: Array<Record<string, unknown>> = [];
  let usageMetadata: unknown = undefined;
  let buffer = '';
  const handle = (line: string) => {
    if (!line.startsWith('data:')) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') return;
    let chunk: Record<string, unknown>;
    try {
      chunk = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }
    if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
    const candidates = Array.isArray(chunk.candidates) ? (chunk.candidates as Array<Record<string, unknown>>) : [];
    const chunkParts =
      ((candidates[0]?.content as { parts?: Array<Record<string, unknown>> } | undefined)?.parts) ?? [];
    for (const part of chunkParts) {
      const last = parts[parts.length - 1];
      if (typeof part.text === 'string' && !part.functionCall) {
        if (part.text) onText(part.text);
        if (last && typeof last.text === 'string' && !last.functionCall) {
          last.text = `${last.text}${part.text}`;
          if (part.thoughtSignature) last.thoughtSignature = part.thoughtSignature;
          continue;
        }
      }
      parts.push({ ...part });
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      handle(buffer.slice(0, newline).replace(/\r$/, ''));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf('\n');
    }
  }
  if (buffer) handle(buffer);
  return normalizeGeminiResponse({
    candidates: [{ content: { role: 'model', parts } }],
    ...(usageMetadata ? { usageMetadata } : {}),
  });
}

export type FunctionCall = {
  call_id: string;
  name: string;
  arguments: string;
  /** Gemini 3 function-calling must echo this on the next generateContent turn. */
  thoughtSignature?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MeterClient = any;

type CapRow = { usd: number; cap: number };

function capFromRpc(data: unknown): CapRow | null {
  const row = (Array.isArray(data) ? data[0] : data) as { usd?: unknown; cap_usd?: unknown } | null;
  if (!row) return null;
  const capRaw = row.cap_usd;
  return {
    usd: Number(row.usd ?? 0),
    cap: capRaw == null || capRaw === '' ? DEFAULT_MONTHLY_CAP_USD : Number(capRaw),
  };
}

function overCapMessage(cap: number): string {
  return `This school is over its monthly AI budget ($${cap}).`;
}

export async function assertUnderAiCap(supabase: MeterClient): Promise<void> {
  const { data, error } = await supabase.rpc('ai_spend_this_month');
  if (error) return;
  const row = capFromRpc(data);
  if (row && Number.isFinite(row.cap) && row.cap > 0 && row.usd >= row.cap) {
    throw new Error(overCapMessage(row.cap));
  }
}

/**
 * Budget pre-check, memoized per request client: an Ask loop / multi-call ingest pays the
 * RPC once, and it runs alongside the model call instead of in front of it.
 */
const capChecks = new WeakMap<object, Promise<CapRow | null>>();
function capCheckFor(supabase: MeterClient): Promise<CapRow | null> {
  if (supabase && typeof supabase === 'object') {
    const hit = capChecks.get(supabase);
    if (hit) return hit;
  }
  const check = Promise.resolve()
    .then(() => supabase.rpc('ai_spend_this_month'))
    .then(({ data, error }: { data: unknown; error: unknown }) => (error ? null : capFromRpc(data)))
    .catch(() => null);
  if (supabase && typeof supabase === 'object') capChecks.set(supabase, check);
  return check;
}

/** Keep the isolate alive for background work (Supabase Edge Runtime); plain promise elsewhere. */
export function runInBackground(work: Promise<unknown>): void {
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  const guarded = work.catch((err) => console.warn('background task failed', err instanceof Error ? err.message : err));
  if (runtime?.waitUntil) runtime.waitUntil(guarded);
}

function meterUsage(
  supabase: MeterClient,
  row: { functionName: string; model: string; captureId?: string | null; inputTokens: number; outputTokens: number; usd: number },
): Promise<void> {
  return (async () => {
    // Meter is best-effort and off the critical path. Never fail the teacher draft for a log insert.
    const [{ data: userData }, { data: schoolId }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc('my_school_id'),
    ]);
    if (typeof schoolId === 'string' && schoolId) {
      await supabase.from('ai_usage').insert({
        school_id: schoolId,
        teacher_id: userData?.user?.id ?? null,
        function: row.functionName,
        model: row.model,
        capture_id: row.captureId ?? null,
        input_tokens: row.inputTokens,
        output_tokens: row.outputTokens,
        usd: row.usd,
      });
    }
  })();
}

const RETRY_DELAY_MS = 250;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(err: unknown): boolean {
  if (err instanceof AiProviderError) return err.status === 429 || err.status >= 500;
  if (err instanceof Error) {
    return err.name === 'TimeoutError' || err.name === 'AbortError' || /network|connection|timed out|fetch failed/i.test(err.message);
  }
  return false;
}

function isGeminiOverloaded(err: unknown): boolean {
  return err instanceof AiProviderError && err.provider === 'gemini' && (err.status === 429 || err.status === 503);
}

function isGeminiModelMissing(err: unknown): boolean {
  return err instanceof AiProviderError && err.provider === 'gemini' && err.status === 404;
}

function describeAiError(err: unknown, timeoutMs: number, provider: AiProvider): Error {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return new AiProviderError(`AI timed out after ${Math.round(timeoutMs / 1000)}s`, 504, provider);
  }
  return err instanceof Error ? err : new Error(String(err));
}

type Attempt = { provider: AiProvider; apiKey: string; model: string };

async function runAttempt(
  attempt: Attempt,
  job: AiJob,
  pass: AiPass,
  payloadInput: unknown,
  baseExtra: Record<string, unknown>,
  timeoutMs: number,
  abort: AbortSignal,
  onText?: (delta: string) => void,
): Promise<Record<string, unknown>> {
  const effort = attempt.provider === 'xai' ? reasoningEffortFor(attempt.model, pass) : undefined;
  const extra = {
    ...(effort ? { reasoning_effort: effort } : {}),
    ...baseExtra,
  };
  const signal = AbortSignal.any([abort, AbortSignal.timeout(timeoutMs)]);
  if (attempt.provider === 'gemini') {
    return await geminiGenerate(attempt.apiKey, attempt.model, payloadInput, extra, signal, onText);
  }
  const payload = await xaiResponses(attempt.apiKey, attempt.model, payloadInput, extra, signal);
  // xAI path is not streamed; hand the whole answer over at once.
  if (onText) {
    const text = outputText(payload);
    if (text && !functionCalls(payload).length) onText(text);
  }
  return payload;
}

export async function callMetered(
  supabase: MeterClient,
  apiKey: string,
  input: {
    job: AiJob;
    pass?: AiPass;
    functionName: string;
    captureId?: string | null;
    payload: unknown;
    extra?: Record<string, unknown>;
    /** Structured output: JSON Schema for the reply (Gemini responseJsonSchema / xAI json_schema). */
    schema?: Record<string, unknown>;
    /** Per-call model timeout; defaults per job (see modelTimeoutMsFor). */
    timeoutMs?: number;
    /** Stream text deltas (Gemini SSE). A retry only happens if nothing was streamed yet. */
    onText?: (delta: string) => void;
  },
): Promise<Record<string, unknown>> {
  const provider = resolveAiProvider();
  const pass = input.pass ?? 'cheap';
  const timeoutMs = input.timeoutMs ?? modelTimeoutMsFor(input.job, pass);
  const resolution =
    (input.extra?.mediaResolution as MediaResolution | undefined) ?? mediaResolutionFor(input.job, pass, input.payload);
  const baseExtra: Record<string, unknown> = {
    ...(resolution ? { mediaResolution: resolution } : {}),
    ...(input.schema ? { jsonSchema: input.schema, schemaName: input.functionName.replace(/[^a-z0-9_]/gi, '_') } : {}),
    ...(input.extra ?? {}),
  };

  // Per-job model from aiPolicy.ts (strong Gemini jobs carry Flash-Lite as their quota fallback).
  const chain = modelChainFor(provider, input.job, pass, {
    geminiLite: Deno.env.get('KELYRA_GEMINI_LITE_MODEL'),
    geminiStrong: Deno.env.get('KELYRA_GEMINI_STRONG_MODEL'),
  });
  const primary: Attempt = { provider, apiKey, model: chain[0]! };
  const xaiKey = Deno.env.get('XAI_API_KEY');
  const fallback: Attempt | null =
    chain.length > 1
      ? { provider, apiKey, model: chain[1]! }
      : provider === 'gemini' && xaiKey
        ? { provider: 'xai', apiKey: xaiKey, model: modelFor(input.job, pass) }
        : null;

  // Budget check runs alongside the model call; if the school is over cap we abort the call.
  const abort = new AbortController();
  const capCheck = capCheckFor(supabase).then((row) => {
    if (row && Number.isFinite(row.cap) && row.cap > 0 && row.usd >= row.cap) {
      abort.abort(new Error(overCapMessage(row.cap)));
      return overCapMessage(row.cap);
    }
    return null;
  });

  let used = primary;
  let payload: Record<string, unknown>;
  let streamed = false;
  const onText = input.onText
    ? (delta: string) => {
        streamed = true;
        input.onText!(delta);
      }
    : undefined;
  try {
    try {
      payload = await runAttempt(primary, input.job, pass, input.payload, baseExtra, timeoutMs, abort.signal, onText);
    } catch (err) {
      const modelMissing = Boolean(fallback) && isGeminiModelMissing(err);
      if (abort.signal.aborted || streamed || !(isRetryable(err) || modelMissing)) throw err;
      // One fast retry. Gemini 429/503 (quota / high demand) or an unknown strong model goes to
      // the job's fallback model (strong → Flash-Lite), else to xAI when a key exists.
      used = fallback && (isGeminiOverloaded(err) || modelMissing) ? fallback : primary;
      console.warn(
        `${input.functionName} ${primary.provider} failed (${err instanceof Error ? err.message.slice(0, 120) : err}); retry via ${used.provider}`,
      );
      if (used === primary) await sleep(RETRY_DELAY_MS);
      payload = await runAttempt(used, input.job, pass, input.payload, baseExtra, timeoutMs, abort.signal, onText);
    }
  } catch (err) {
    const overCap = await capCheck;
    if (overCap) throw new Error(overCap);
    throw describeAiError(err, timeoutMs, used.provider);
  }
  const overCap = await capCheck;
  if (overCap) throw new Error(overCap);

  const usage = parseUsage(payload);
  const usd = estimateUsd(used.model, usage.inputTokens, usage.outputTokens);
  runInBackground(
    meterUsage(supabase, {
      functionName: input.functionName,
      model: used.model,
      captureId: input.captureId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      usd,
    }),
  );
  payload.__kelyraUsd = usd;
  payload.__kelyraModel = used.model;
  return payload;
}

export function functionCalls(payload: Record<string, unknown>): FunctionCall[] {
  const output = payload.output as Array<Record<string, unknown>> | undefined;
  return (output ?? [])
    .filter((item) => item.type === 'function_call' || item.type === 'tool_call')
    .map((item) => {
      const fn = (item.function as Record<string, unknown> | undefined) ?? item;
      const args = fn.arguments ?? item.arguments;
      const thoughtSignature = thoughtSignatureOf(item) ?? thoughtSignatureOf(fn);
      return {
        call_id: String(item.call_id ?? item.id ?? ''),
        name: String(fn.name ?? item.name ?? ''),
        arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
        ...(thoughtSignature ? { thoughtSignature } : {}),
      };
    })
    .filter((item) => item.call_id && item.name);
}

export function outputText(payload: Record<string, unknown>): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }
  const output = payload.output as Array<{ content?: Array<{ text?: string }> }> | undefined;
  return (output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('');
}

export function extractJson(raw: string): Record<string, unknown> {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function parseHomeworkDraft(raw: string): {
  gaps: Array<{ label: string; sortOrder: number }>;
  draftScore: number | null;
  teacherNote: string | null;
} {
  const parsed = extractJson(raw);
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps
        .map((gap, index) => {
          const row = gap as { label?: string; sortOrder?: number };
          return {
            label: String(row.label ?? '').trim(),
            sortOrder: Number(row.sortOrder ?? index + 1),
          };
        })
        .filter((gap) => gap.label)
        .slice(0, 3)
    : [];
  return {
    gaps,
    draftScore: typeof parsed.draftScore === 'number' ? parsed.draftScore : null,
    teacherNote: typeof parsed.teacherNote === 'string' ? parsed.teacherNote : null,
  };
}

export function parsePracticeItems(raw: string): Array<{
  id: string;
  prompt: string;
  answerKey?: string;
}> {
  const parsed = extractJson(raw);
  if (!Array.isArray(parsed.items)) return [];
  return parsed.items
    .map((item, index) => {
      const row = item as { id?: string; prompt?: string; answerKey?: string };
      return {
        id: String(row.id ?? `item-${index + 1}`),
        prompt: String(row.prompt ?? '').trim(),
        ...(row.answerKey ? { answerKey: String(row.answerKey) } : {}),
      };
    })
    .filter((item) => item.prompt)
    .slice(0, 8);
}

function asDraftScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return null;
}

export function parseSubmissionReview(raw: string | Record<string, unknown> | null | undefined): {
  summary: string | null;
  gaps: Array<{ label: string; sortOrder: number }>;
  draftScore: number | null;
  teacherNote: string | null;
  items: Array<{ id: string; prompt: string; answerKey?: string }>;
} {
  const parsed = extractJson(typeof raw === 'string' ? raw : JSON.stringify(raw ?? {}));
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps
        .map((gap, index) => {
          const row = gap as { label?: string; sortOrder?: number };
          return {
            label: String(row.label ?? '').trim(),
            sortOrder: Number(row.sortOrder ?? index + 1),
          };
        })
        .filter((gap) => gap.label)
        .slice(0, 3)
    : [];
  const items = parsePracticeItems(JSON.stringify({ items: parsed.items }));
  const summary = typeof parsed.summary === 'string' ? parsed.summary.replace(/\s+/g, ' ').trim() : '';
  const teacherNote =
    typeof parsed.teacherNote === 'string' ? parsed.teacherNote.replace(/\s+/g, ' ').trim() : '';
  return {
    summary: summary || null,
    gaps,
    draftScore: asDraftScore(parsed.draftScore),
    teacherNote: teacherNote || null,
    items,
  };
}
