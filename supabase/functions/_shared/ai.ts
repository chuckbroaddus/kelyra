/**
 * Edge AI adapter (text / vision). Never ship model keys in the Expo app.
 *
 * Prefer GEMINI_API_KEY → Gemini Flash-Lite. Else XAI_API_KEY → xAI Responses.
 * Local development uses Grok CLI OAuth instead — see scripts/ai-dev-server.mjs.
 * Speech-to-text stays on xAI (transcribe/); do not route STT here.
 */

import {
  DEFAULT_MONTHLY_CAP_USD,
  FLAGSHIP_MODEL,
  GEMINI_FLASH_LITE,
  PRACTICE_MODEL,
  estimateUsd,
  modelFor,
  parseUsage,
  reasoningEffortFor,
  type AiJob,
  type AiPass,
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

export const homeworkPrompt = `You are helping a K-12 teacher review one student's work.
Look only at the photo. Return JSON only, no markdown:
{"gaps":[{"label":"short skill name","sortOrder":1}],"draftScore":null,"teacherNote":"one short sentence or null"}
Rules:
- 1 to 3 gaps. Labels are short, like "two-digit regrouping" or "thesis clarity".
- If the image is blank, unreadable, or not student work, return {"gaps":[],"draftScore":null,"teacherNote":null}
- Do not invent a student name or extra biography.`;

export function practicePrompt(skillLabel: string): string {
  return `You write short paper practice items for one K-12 skill: ${skillLabel}.
Return JSON only, no markdown:
{"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"optional short key"}]}
Rules:
- 4 to 6 items.
- Age-appropriate. No student names. No images.
- Prompts are one or two sentences.`;
}

export const submissionReviewPrompt = `You are helping a K-12 teacher review one student's submitted work.
Return JSON only, no markdown:
{"summary":"one or two sentences","draftScore":null,"teacherNote":"short Glow/Grow or null","gaps":[{"label":"short skill name","sortOrder":1}],"items":[{"id":"item-1","prompt":"one sentence the student can answer on paper","answerKey":"short key"}]}
Rules:
- summary is what they turned in, not a biography.
- draftScore is 0-100 when you can grade the work, otherwise null.
- 0 to 3 gaps. Labels are short, like "two-digit regrouping". Empty if there is no skill gap worth follow-up.
- If there is at least one gap, items must be 4 to 6 short follow-up practice questions for the first gap.
- If there is no gap, items must be [].
- Keep any teacher-typed gap labels and practice questions listed below. You may add more, not delete theirs.
- Age-appropriate. No student names. No images.
- For lessons, skipped items, extra tries, answers that were wrong first then corrected, and hints can show a skill gap even when the last answer is right. Prefer a gap when those cluster. Do not invent a gap from clean first-try work.`;

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

export async function xaiResponses(
  apiKey: string,
  model: string,
  input: unknown,
  extra: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(`${xaiBaseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ store: false, model, input, ...extra }),
  });
  if (!response.ok) {
    throw new Error(`Grok failed: ${response.status} ${await response.text()}`);
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

async function inlineImagePart(imageUrl: string): Promise<Record<string, unknown>> {
  // Same SSRF allowlist as Ask hydrate: data: or this project's storage https only.
  if (!isAllowedAskImageUrl(imageUrl)) {
    throw new Error('Image URL is not allowed');
  }
  const dataUrl = imageUrl.match(/^data:([^;]+);base64,(.+)$/s);
  if (dataUrl) {
    return { inlineData: { mimeType: dataUrl[1] || 'image/jpeg', data: dataUrl[2] } };
  }
  const response = await fetch(imageUrl, { redirect: 'error' });
  if (!response.ok) {
    throw new Error(`Could not fetch image for Gemini: ${response.status}`);
  }
  const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { inlineData: { mimeType: mime, data: bytesToBase64(bytes) } };
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
  const parts: Array<Record<string, unknown>> = [];
  for (const item of content) {
    const row = item as { type?: string; text?: string; image_url?: string };
    if (!row || typeof row !== 'object') continue;
    if (row.type === 'input_image' && typeof row.image_url === 'string') {
      parts.push(await inlineImagePart(row.image_url));
      continue;
    }
    if (row.type === 'input_text' || row.type === 'text' || typeof row.text === 'string') {
      const text = String(row.text ?? '').trim();
      if (text) parts.push({ text });
    }
  }
  return parts;
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

export async function geminiGenerate(
  apiKey: string,
  model: string,
  input: unknown,
  extra: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const body: Record<string, unknown> = {
    contents: await geminiContentsFromInput(input),
  };
  if (typeof extra.instructions === 'string' && extra.instructions.trim()) {
    body.systemInstruction = { parts: [{ text: extra.instructions.trim() }] };
  }
  const tools = geminiToolsFromExtra(extra);
  if (tools) body.tools = tools;
  const maxOut = Number(extra.max_output_tokens ?? extra.maxOutputTokens);
  if (Number.isFinite(maxOut) && maxOut > 0) {
    body.generationConfig = { maxOutputTokens: Math.round(maxOut) };
  }
  const response = await fetch(
    `${geminiBaseUrl}/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error(`Gemini failed: ${response.status} ${await response.text()}`);
  }
  return normalizeGeminiResponse((await response.json()) as Record<string, unknown>);
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

export async function assertUnderAiCap(supabase: MeterClient): Promise<void> {
  const { data, error } = await supabase.rpc('ai_spend_this_month');
  if (error) return;
  const row = Array.isArray(data) ? data[0] : data;
  const spent = Number(row?.usd ?? 0);
  const capRaw = row?.cap_usd;
  const cap = capRaw == null || capRaw === '' ? DEFAULT_MONTHLY_CAP_USD : Number(capRaw);
  if (Number.isFinite(cap) && cap > 0 && spent >= cap) {
    throw new Error(`This school is over its monthly AI budget ($${cap}).`);
  }
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
  },
): Promise<Record<string, unknown>> {
  await assertUnderAiCap(supabase);
  const provider = resolveAiProvider();
  const pass = input.pass ?? 'cheap';
  const model = provider === 'gemini' ? GEMINI_FLASH_LITE : modelFor(input.job, pass);
  const effort = provider === 'xai' ? reasoningEffortFor(model, pass) : undefined;
  const extra = {
    ...(effort ? { reasoning_effort: effort } : {}),
    ...(input.extra ?? {}),
  };
  const payload =
    provider === 'gemini'
      ? await geminiGenerate(apiKey, model, input.payload, extra)
      : await xaiResponses(apiKey, model, input.payload, extra);
  const usage = parseUsage(payload);
  const usd = estimateUsd(model, usage.inputTokens, usage.outputTokens);
  try {
    const { data: userData } = await supabase.auth.getUser();
    const { data: schoolId } = await supabase.rpc('my_school_id');
    if (typeof schoolId === 'string' && schoolId) {
      await supabase.from('ai_usage').insert({
        school_id: schoolId,
        teacher_id: userData.user?.id ?? null,
        function: input.functionName,
        model,
        capture_id: input.captureId ?? null,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
        usd,
      });
    }
  } catch {
    // Meter is best-effort. Never fail the teacher draft for a log insert.
  }
  payload.__kelyraUsd = usd;
  payload.__kelyraModel = model;
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
