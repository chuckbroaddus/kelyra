import {
  defaultVisionModel,
  parsePracticeItems,
  practicePrompt,
  requireXaiKey,
  outputText,
  xaiResponses,
} from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const apiKey = requireXaiKey();
    const { skillLabel } = (await req.json()) as { skillLabel?: string };
    if (!skillLabel?.trim()) return json({ error: 'skillLabel required' }, 400);

    const payload = await xaiResponses(apiKey, defaultVisionModel, practicePrompt(skillLabel.trim()));
    const items = parsePracticeItems(outputText(payload));
    if (!items.length) return json({ error: 'Grok returned no practice items' }, 502);
    return json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generate-practice failed';
    const status = message.includes('XAI_API_KEY') ? 501 : 500;
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
