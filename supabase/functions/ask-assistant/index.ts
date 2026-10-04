import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, functionCalls, outputText, requireXaiKey } from '../_shared/ai.ts';
import { imageDetailFor } from '../_shared/aiPolicy.ts';
import { isAllowedAskImageUrl } from '../_shared/askImageUrl.ts';
import {
  askActorSystemLine,
  filterAskToolDefs,
  mergeAskGrants,
  type ProfileHats,
} from '../_shared/askToolPolicy.ts';
import {
  gauthRefusalCard,
  isFamilyAskSeat,
  shouldRefuseAskBeforeVendor,
  stripAskImagesForFamilySeat,
} from '../_shared/askHomeworkRefuse.ts';
import { formatTutorBriefForAsk, parseTutorBriefSafe } from '../_shared/tutorBrief.ts';

const FALLBACK = "I can’t tell from what’s saved. Open Needs Attention or the student’s page.";
const PHOTO_FAILED = '(A photo was attached but could not be opened.)';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function hydrateAskImages(input: unknown): Promise<unknown> {
  if (!Array.isArray(input)) return input;
  const next = [];
  for (const item of input) {
    const row = item as { content?: unknown };
    if (!row || !Array.isArray(row.content)) {
      next.push(item);
      continue;
    }
    const content = [];
    for (const part of row.content as Array<{ type?: string; image_url?: string; text?: string; detail?: string }>) {
      if (part?.type === 'input_image' && typeof part.image_url === 'string' && !part.image_url.startsWith('data:')) {
        if (!isAllowedAskImageUrl(part.image_url)) {
          content.push({ type: 'input_text', text: PHOTO_FAILED });
          continue;
        }
        try {
          const response = await fetch(part.image_url, { redirect: 'error' });
          if (!response.ok) throw new Error(String(response.status));
          const bytes = new Uint8Array(await response.arrayBuffer());
          const mime = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
          content.push({
            type: 'input_image',
            image_url: `data:${mime};base64,${bytesToBase64(bytes)}`,
            detail: part.detail === 'high' ? 'high' : imageDetailFor('cheap'),
          });
        } catch {
          content.push({ type: 'input_text', text: PHOTO_FAILED });
        }
      } else {
        content.push(part);
      }
    }
    next.push({ ...row, content });
  }
  return next;
}

/**
 * Per-question seat cache. One Ask question is up to 8 model rounds, each a fresh request with
 * the same JWT; re-reading auth + profile + grants every round cost three serial round trips.
 * Keyed by a hash of the exact bearer token (gateway already verified it), 60s TTL.
 */
type AskSeat = { uid: string; profile: ProfileHats; grants: ReturnType<typeof mergeAskGrants> };
const SEAT_TTL_MS = 60_000;
const seatCache = new Map<string, { at: number; seat: AskSeat }>();

async function tokenKey(authorization: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(authorization));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function cachedSeat(key: string): AskSeat | null {
  const hit = seatCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > SEAT_TTL_MS) {
    seatCache.delete(key);
    return null;
  }
  return hit.seat;
}

function rememberSeat(key: string, seat: AskSeat) {
  seatCache.set(key, { at: Date.now(), seat });
  if (seatCache.size > 200) {
    const oldest = seatCache.keys().next().value;
    if (oldest !== undefined) seatCache.delete(oldest);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return Response.json({ error: 'Sign in to Kelyra first.' }, { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    );
    const bodyPromise = req.json().catch(() => ({}));
    const seatKey = await tokenKey(authorization);
    let seat = cachedSeat(seatKey);
    if (!seat) {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user?.id) {
        return Response.json({ error: 'Sign in to Kelyra first.' }, { status: 401 });
      }

      const uid = auth.user.id;
      // Profile and grants are independent reads: fetch together.
      const [{ data: profileRow, error: profileError }, { data: grantRows }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, role, also_administrator, also_teacher, parent_id, display_name, username')
          .eq('id', uid)
          .maybeSingle(),
        supabase.from('capability_grants').select('capability_id, role, access'),
      ]);
      if (profileError || !profileRow?.role) {
        return Response.json({ error: 'Sign in to Kelyra first.' }, { status: 401 });
      }
      seat = { uid, profile: profileRow as ProfileHats, grants: mergeAskGrants(grantRows) };
      rememberSeat(seatKey, seat);
    }
    const { uid, profile, grants } = seat;

    const body = await bodyPromise;
    // Seat comes from profiles for this uid only — never from the client claim.
    const requested = Array.isArray(body.tools) ? body.tools : [];
    const tools = filterAskToolDefs(requested, profile, grants);
    console.log(
      `ask-assistant getUser=${uid} role=${profile.role} tools=${tools.length}/${requested.length} (policy)`,
    );

    const extra: Record<string, unknown> = {};
    if (tools.length) extra.tools = tools;
    const actor = askActorSystemLine(profile);
    const clientInstructions =
      typeof body.instructions === 'string' && body.instructions.trim() ? body.instructions.trim() : '';

    // A-Filing: client may pass assignmentId ground only — never trust a client pack body.
    const assignmentId =
      typeof body.assignmentId === 'string' && body.assignmentId.trim() ? body.assignmentId.trim() : '';
    const boundStudentId =
      typeof body.studentId === 'string' && body.studentId.trim() ? body.studentId.trim() : null;
    let packLine = '';
    if (assignmentId) {
      const { data: packRaw } = await supabase.rpc('get_tutor_brief_safe', {
        p_assignment_id: assignmentId,
        p_student_id: boundStudentId,
      });
      const pack = parseTutorBriefSafe(packRaw);
      if (pack) packLine = formatTutorBriefForAsk(pack);
    }

    // Stable prefix first (client rules are identical per seat/role) so Gemini implicit
    // caching can reuse it across rounds; per-user actor + pack lines go last.
    const merged = [clientInstructions, actor, packLine].filter(Boolean).join('\n\n');
    extra.instructions = merged;

    const raw = Array.isArray(body.input) && body.input.length
      ? body.input
      : Array.isArray(body.messages)
        ? body.messages
            .map((item: { from?: string; text?: string }) => ({
              role: item?.from === 'assistant' ? 'assistant' : 'user',
              content: String(item?.text ?? '').trim(),
            }))
            .filter((item: { content: string }) => item.content)
        : [{ role: 'user', content: 'Hello' }];

    // GAUTH G0/G3: family seats — drop vision; refuse graded-solve BEFORE vendor.
    // ASK-P0-10: refuse still wins even when a confirmed pack is present.
    const familySeat = isFamilyAskSeat(profile.role);
    const gatedInput = familySeat ? stripAskImagesForFamilySeat(raw) : raw;
    if (shouldRefuseAskBeforeVendor({ role: profile.role, rawInput: raw })) {
      const card = gauthRefusalCard();
      console.log(`ask-assistant getUser=${uid} role=${profile.role} refuse-before-vendor`);
      return json({ text: card.text, refusal: true, title: card.title });
    }

    const input = await hydrateAskImages(gatedInput);
    const apiKey = requireXaiKey();
    if (body.stream === true) {
      return streamAskReply(supabase, apiKey, input, extra);
    }
    const payload = await callMetered(supabase, apiKey, {
      job: 'ask',
      functionName: 'ask-assistant',
      payload: input,
      extra,
    });
    const calls = functionCalls(payload);
    const responseId = typeof payload.id === 'string' ? payload.id : undefined;
    if (calls.length) return json({ toolCalls: calls, responseId });
    const text = outputText(payload).trim();
    return json({ text: text || FALLBACK, responseId });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Ask failed' }, 400);
  }
});

/**
 * SSE answer: `delta` events carry text as it is generated, then one `done` event with the
 * same body the JSON path returns ({ text } or { toolCalls }), or `error`.
 */
function streamAskReply(
  supabase: Parameters<typeof callMetered>[0],
  apiKey: string,
  input: unknown,
  extra: Record<string, unknown>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const payload = await callMetered(supabase, apiKey, {
          job: 'ask',
          functionName: 'ask-assistant',
          payload: input,
          extra,
          onText: (delta) => send('delta', { text: delta }),
        });
        const calls = functionCalls(payload);
        const responseId = typeof payload.id === 'string' ? payload.id : undefined;
        if (calls.length) send('done', { toolCalls: calls, responseId });
        else send('done', { text: outputText(payload).trim() || FALLBACK, responseId });
      } catch (err) {
        send('error', { error: err instanceof Error ? err.message : 'Ask failed' });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { ...cors(), 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors() });
}
