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

const FALLBACK = "I can’t tell from what’s saved. Open Needs or the student’s page.";
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user?.id) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }

    const uid = auth.user.id;
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, also_administrator, also_teacher, parent_id, display_name, username')
      .eq('id', uid)
      .maybeSingle();
    if (profileError || !profileRow?.role) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }
    const profile = profileRow as ProfileHats;

    const { data: grantRows } = await supabase
      .from('capability_grants')
      .select('capability_id, role, access');
    const grants = mergeAskGrants(grantRows);

    const body = await req.json();
    // Seat comes from profiles for this uid only — never from the client claim.
    const requested = Array.isArray(body.tools) ? body.tools : [];
    const tools = filterAskToolDefs(requested, profile, grants);
    console.log(
      `ask-assistant getUser=${uid} role=${profile.role} tools=${tools.length}/${requested.length} (policy)`,
    );

    const apiKey = requireXaiKey();
    const extra: Record<string, unknown> = {};
    if (tools.length) extra.tools = tools;
    const actor = askActorSystemLine(profile);
    const clientInstructions =
      typeof body.instructions === 'string' && body.instructions.trim() ? body.instructions.trim() : '';
    extra.instructions = clientInstructions ? `${actor}\n\n${clientInstructions}` : actor;

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
    const input = await hydrateAskImages(raw);
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

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: cors() });
}
