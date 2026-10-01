import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { CLOSEST_VEHICLE_RULES } from '../_shared/closestVehicle.ts';
import { withCors } from '../_shared/cors.ts';
import { emptyResult, shapeRideLprResult } from '../_shared/rideLprResult.ts';

const PROMPT = `You read school car-rider / dismissal documents and vehicle photos for Kelyra Ride.
Return JSON only with this shape:
{"document_kind":"vehicle_photo","plate":"ABC1234","plateFront":null,"plateBack":null,"make":"Toyota","model":"Camry","side":"back","tag_number":null,"riders":[],"authorized_pickups":[],"confidence":0.0,"unreadable":false,"reject_reason":null,"other_plates_seen":[]}

document_kind (pick one):
- vehicle_photo: bumper/grille plate, temporary paper dealer tag, or vehicle body with plate
- hang_tag: car-rider hang tag / dashboard pass with plate and/or TAG # and rider names
- check_in_sheet: staff check-in list or handwritten check-in slip with student names (and optional plates)
- authorized_pickup: parent form listing student + authorized adults + optional vehicle
- rejected: homework, syllabus, menu, roster-only class docs, or anything not ride-related
- unknown: cannot tell

Rules:
- plate / plateFront / plateBack: uppercase letters+digits only. Strip spaces and hyphens.
- If only part of a plate is visible, set plate null and unreadable true — NEVER invent missing characters.
${CLOSEST_VEHICLE_RULES}
- Temporary paper tags still count as vehicle_photo; read the printed number.
- Out-of-state plates are fine; do not require Texas.
- Ambiguous O vs 0: prefer digit 0 inside numeric runs; do not invent a different plate.
- Hang tags: the large monospaced plate string (not the TAG #) is plate; always fill plate when printed.
- When both front and back plates appear, set plateFront and plateBack; primary plate prefers the rear/back plate.
- side: front, back, or unknown for which plate face the photo mostly shows.
- make / model: only when clearly readable from badges/text; never invent from guesswork.
- tag_number: hang-tag id digits/letters only (e.g. 1042 from "TAG # 1042").
- riders: student names printed on hang tags / check-in sheets / pickup forms (synthetic ok).
- authorized_pickups: adult names listed as authorized to pick up.
- For multi-row check-in sheets: plate stays null unless a single primary plate is labeled; fill riders with every student name.
- Negatives (homework, syllabus, cafeteria menu, unrelated): document_kind=rejected, plate/make/model null, unreadable true, short reject_reason.
- Never invent a person, parent, student, plate, make, or model that is not clearly on the page.
- Night, glare, angle, shadow: still try; if not confident enough to read the full plate, unreadable true and plate null.`;

// Capture web calls ride-lpr straight from the browser (supabase.functions.invoke),
// so the preflight and every reply need CORS headers or the plate read silently fails.
Deno.serve(withCors(handleRideLpr));

async function handleRideLpr(req: Request): Promise<Response> {
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
      return Response.json(emptyResult({ document_kind: 'unknown' }), { status: 200 });
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
            { type: 'input_text', text: PROMPT },
          ],
        },
      ],
    });
    return Response.json(shapeRideLprResult(extractJson(outputText(payload))));
  } catch (err) {
    return Response.json(
      emptyResult({
        error: err instanceof Error ? err.message : 'LPR failed',
      }),
      { status: 200 },
    );
  }
}
