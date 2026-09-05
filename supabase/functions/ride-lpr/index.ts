import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
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
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user?.id) {
      return Response.json({ error: 'Sign in to Kelyra first.' }, { status: 401 });
    }

    const body = await req.json();
    const storagePath = String(body.storagePath ?? body.storage_path ?? '').trim();
    if (!storagePath) {
      return Response.json({ error: 'storagePath required' }, { status: 400 });
    }
    if (!storagePath.startsWith(`${auth.user.id}/`)) {
      return Response.json({ error: 'not allowed' }, { status: 403 });
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from('photos')
      .createSignedUrl(storagePath, 120);
    if (signedError || !signed?.signedUrl) {
      return Response.json({ plate: null, unreadable: true }, { status: 200 });
    }

    const apiKey = requireXaiKey();
    const payload = await callMetered(supabase, apiKey, {
      job: 'ride_lpr',
      functionName: 'ride-lpr',
      payload: [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: signed.signedUrl, detail: 'high' },
            {
              type: 'input_text',
              text: `Read the vehicle plate in this school dismissal photo.
JSON only: {"plate":"ABC1234","confidence":0.0,"unreadable":false}
Plate: uppercase letters+digits only. Empty if unreadable.
Never invent a person, parent, or student.`,
            },
          ],
        },
      ],
    });
    const parsed = extractJson(outputText(payload));
    const raw = typeof parsed.plate === 'string' ? parsed.plate : '';
    const plate = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const unreadable = Boolean(parsed.unreadable) || !plate;
    return Response.json({
      plate: unreadable ? null : plate,
      unreadable,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    });
  } catch (err) {
    return Response.json(
      {
        plate: null,
        unreadable: true,
        error: err instanceof Error ? err.message : 'LPR failed',
      },
      { status: 200 },
    );
  }
});
