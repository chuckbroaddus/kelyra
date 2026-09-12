import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';

function cleanPlate(raw: unknown): string {
  return typeof raw === 'string' ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
}

function cleanText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.replace(/\s+/g, ' ').trim();
  return value || null;
}

function cleanSide(raw: unknown): 'front' | 'back' | 'unknown' {
  const value = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if (value === 'front' || value === 'back') return value;
  return 'unknown';
}

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
      return Response.json({
        plate: null,
        plateFront: null,
        plateBack: null,
        make: null,
        model: null,
        side: 'unknown',
        unreadable: true,
      }, { status: 200 });
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
              text: `Read the vehicle in this school dismissal / Ride photo.
JSON only: {"plate":"ABC1234","plateFront":null,"plateBack":null,"make":"Toyota","model":"Camry","side":"back","confidence":0.0,"unreadable":false}
Rules:
- plate: primary readable plate, uppercase letters+digits only. Empty if unreadable.
- plateFront / plateBack: fill when that side is clearly visible in this shot; otherwise null.
- side: front, back, or unknown for which plate face this photo mostly shows.
- make / model: vehicle make and model if clearly readable from badges/shape; never invent.
- Never invent a person, parent, or student.`,
            },
          ],
        },
      ],
    });
    const parsed = extractJson(outputText(payload));
    const plate = cleanPlate(parsed.plate);
    const plateFront = cleanPlate(parsed.plateFront) || null;
    const plateBack = cleanPlate(parsed.plateBack) || null;
    const unreadable = Boolean(parsed.unreadable) || !plate;
    return Response.json({
      plate: unreadable ? null : plate,
      plateFront: plateFront || (cleanSide(parsed.side) === 'front' && plate ? plate : null),
      plateBack: plateBack || (cleanSide(parsed.side) === 'back' && plate ? plate : null),
      make: cleanText(parsed.make),
      model: cleanText(parsed.model),
      side: cleanSide(parsed.side),
      unreadable,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    });
  } catch (err) {
    return Response.json(
      {
        plate: null,
        plateFront: null,
        plateBack: null,
        make: null,
        model: null,
        side: 'unknown',
        unreadable: true,
        error: err instanceof Error ? err.message : 'LPR failed',
      },
      { status: 200 },
    );
  }
});
