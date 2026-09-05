import { createClient } from 'npm:@supabase/supabase-js@2';

const xaiBaseUrl = 'https://api.x.ai/v1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const apiKey = Deno.env.get('XAI_API_KEY');
    if (!apiKey) {
      return json({ error: 'XAI_API_KEY is not set' }, 501);
    }

    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'Sign in to Kelyra first.' }, 401);
    const body = (await req.json()) as { audioBase64?: string; audioUrl?: string; mimeType?: string; keyterms?: string[] };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: auth } } },
    );

    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError || !userData.user?.id) return json({ error: 'Sign in to Kelyra first.' }, 401);

    const form = new FormData();
    form.append('format', 'true');
    form.append('language', 'en');
    for (const term of Array.isArray(body.keyterms) ? body.keyterms : []) {
      if (String(term).length > 1) form.append('keyterm', String(term));
    }

    if (body.audioBase64) {
      const bin = Uint8Array.from(atob(String(body.audioBase64)), (c) => c.charCodeAt(0));
      if (bin.length < 16) return json({ error: 'Recording was empty.' }, 400);
      const mime = String(body.mimeType ?? 'audio/wav');
      const name = mime.includes('webm') ? 'audio.webm' : mime.includes('mp4') ? 'audio.m4a' : 'audio.wav';
      form.append('file', new Blob([bin], { type: mime }), name);
    } else if (body.audioUrl && /^https?:\/\//i.test(String(body.audioUrl))) {
      form.append('url', String(body.audioUrl));
    } else {
      return json({ error: 'audioBase64 or audioUrl required' }, 400);
    }

    const stt = await fetch(`${xaiBaseUrl}/stt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!stt.ok) {
      return json({ error: `STT failed: ${stt.status}` }, 502);
    }

    const result = (await stt.json()) as { text?: string };
    return json({ text: result.text ?? '' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'transcribe-audio failed';
    return json({ error: message }, 500);
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
