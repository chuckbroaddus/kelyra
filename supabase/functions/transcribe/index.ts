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

    const { captureId } = (await req.json()) as { captureId?: string };
    if (!captureId) return json({ error: 'captureId required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: capture, error: captureError } = await supabase
      .from('captures')
      .select('id, audio_asset_id, class_id')
      .eq('id', captureId)
      .single();
    if (captureError || !capture?.audio_asset_id) {
      return json({ error: 'Capture has no audio' }, 400);
    }

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('storage_path, mime_type')
      .eq('id', capture.audio_asset_id)
      .single();
    if (assetError || !asset) return json({ error: 'Audio asset missing' }, 400);

    const { data: signed, error: signedError } = await supabase.storage
      .from('audio')
      .createSignedUrl(asset.storage_path, 120);
    if (signedError || !signed?.signedUrl) {
      return json({ error: 'Could not sign audio URL' }, 500);
    }

    const keyterms = await rosterKeyterms(supabase, capture.class_id);
    const form = new FormData();
    form.append('format', 'true');
    form.append('language', 'en');
    for (const term of keyterms) {
      form.append('keyterm', term);
    }
    form.append('url', signed.signedUrl);

    const stt = await fetch(`${xaiBaseUrl}/stt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!stt.ok) {
      const detail = await stt.text();
      return json({ error: `STT failed: ${stt.status} ${detail}` }, 502);
    }

    const result = (await stt.json()) as { text?: string };
    return json({ text: result.text ?? '' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'transcribe failed';
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

async function rosterKeyterms(
  supabase: ReturnType<typeof createClient>,
  classId: string,
): Promise<string[]> {
  const { data } = await supabase.from('enrollments').select('student_id').eq('class_id', classId);
  const ids = (data ?? []).map((row) => row.student_id as string);
  if (!ids.length) return [];
  const { data: students } = await supabase.from('students').select('display_name').in('id', ids);
  return (students ?? [])
    .map((row) => String(row.display_name).split(/\s+/)[0] ?? '')
    .filter((name) => name.length > 1)
    .slice(0, 40);
}
