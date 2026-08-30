import { createClient } from 'npm:@supabase/supabase-js@2';

import {
  callMetered,
  parsePracticeItems,
  practicePrompt,
  requireXaiKey,
  outputText,
} from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const apiKey = requireXaiKey();
    const { skillLabel } = (await req.json()) as { skillLabel?: string };
    if (!skillLabel?.trim()) return json({ error: 'skillLabel required' }, 400);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const payload = await callMetered(supabase, apiKey, {
      job: 'practice',
      functionName: 'generate-practice',
      payload: practicePrompt(skillLabel.trim()),
    });
    const items = parsePracticeItems(outputText(payload));
    if (!items.length) return json({ error: 'Grok returned no practice items' }, 502);
    return json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generate-practice failed';
    const status =
      message.includes('XAI_API_KEY') || message.includes('GEMINI_API_KEY') ? 501 : 500;
    return json({ error: message }, status);
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
