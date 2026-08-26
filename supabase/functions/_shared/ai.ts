/**
 * SpaceXAI adapter. Runs only inside Edge Functions.
 * Set XAI_API_KEY as a function secret. Never ship it in the Expo app.
 *
 * Local development uses Grok CLI OAuth instead — see scripts/ai-dev-server.mjs.
 */

import {
  DEFAULT_MONTHLY_CAP_USD,
  FLAGSHIP_MODEL,
  PRACTICE_MODEL,
  estimateUsd,
  modelFor,
  parseUsage,
  reasoningEffortFor,
  type AiJob,
  type AiPass,
} from './aiPolicy.ts';

export const xaiBaseUrl = 'https://api.x.ai/v1';
export const defaultVisionModel = FLAGSHIP_MODEL;
export const cheapVisionModel = modelFor('homework');
export const cheapTextModel = PRACTICE_MODEL;

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
- Age-appropriate. No student names. No images.`;

export function requireXaiKey(): string {
  const apiKey = Deno.env.get('XAI_API_KEY');
  if (!apiKey) throw new Error('XAI_API_KEY is not set');
  return apiKey;
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

export type FunctionCall = { call_id: string; name: string; arguments: string };

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
  const pass = input.pass ?? 'cheap';
  const model = modelFor(input.job, pass);
  const effort = reasoningEffortFor(model, pass);
  const extra = {
    ...(effort ? { reasoning_effort: effort } : {}),
    ...(input.extra ?? {}),
  };
  const payload = await xaiResponses(apiKey, model, input.payload, extra);
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
      return {
        call_id: String(item.call_id ?? item.id ?? ''),
        name: String(fn.name ?? item.name ?? ''),
        arguments: typeof args === 'string' ? args : JSON.stringify(args ?? {}),
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
