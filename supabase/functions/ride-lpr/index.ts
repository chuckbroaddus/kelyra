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

const KINDS = [
  'vehicle_photo',
  'hang_tag',
  'check_in_sheet',
  'authorized_pickup',
  'rejected',
  'unknown',
] as const;
type DocKind = (typeof KINDS)[number];

function cleanKind(raw: unknown): DocKind {
  const v = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
  if ((KINDS as readonly string[]).includes(v)) return v as DocKind;
  return 'unknown';
}

function cleanNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    const t = cleanText(item);
    if (t) out.push(t);
  }
  return out;
}

function cleanTag(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return digits || null;
}

function emptyResult(extra: Record<string, unknown> = {}) {
  return {
    document_kind: 'unknown' as DocKind,
    plate: null as string | null,
    plateFront: null as string | null,
    plateBack: null as string | null,
    make: null as string | null,
    model: null as string | null,
    side: 'unknown' as const,
    tag_number: null as string | null,
    riders: [] as string[],
    authorized_pickups: [] as string[],
    unreadable: true,
    confidence: 0,
    reject_reason: null as string | null,
    ...extra,
  };
}

const PROMPT = `You read school car-rider / dismissal documents and vehicle photos for Kelyra Ride.
Return JSON only with this shape:
{"document_kind":"vehicle_photo","plate":"ABC1234","plateFront":null,"plateBack":null,"make":"Toyota","model":"Camry","side":"back","tag_number":null,"riders":[],"authorized_pickups":[],"confidence":0.0,"unreadable":false,"reject_reason":null}

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
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  const res = await handleRideLpr(req);
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.headers.set(key, value);
  return res;
});

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
    const parsed = extractJson(outputText(payload));
    let document_kind = cleanKind(parsed.document_kind);
    const plate = cleanPlate(parsed.plate);
    let plateFront = cleanPlate(parsed.plateFront) || null;
    let plateBack = cleanPlate(parsed.plateBack) || null;
    const side = cleanSide(parsed.side);
    if (!plateFront && side === 'front' && plate) plateFront = plate;
    if (!plateBack && side === 'back' && plate) plateBack = plate;

    let make = cleanText(parsed.make);
    let model = cleanText(parsed.model);
    const tag_number = cleanTag(parsed.tag_number ?? parsed.tagNumber);
    const riders = cleanNames(parsed.riders);
    const authorized_pickups = cleanNames(parsed.authorized_pickups ?? parsed.authorizedPickups);
    const reject_reason = cleanText(parsed.reject_reason ?? parsed.rejectReason);

    if (document_kind === 'unknown') {
      if (reject_reason) document_kind = 'rejected';
      else if (tag_number || (riders.length && !plate && !make)) document_kind = 'hang_tag';
      else if (authorized_pickups.length) document_kind = 'authorized_pickup';
      else if (riders.length > 1) document_kind = 'check_in_sheet';
      else if (plate || plateFront || plateBack) document_kind = 'vehicle_photo';
    }

    if (document_kind === 'rejected') {
      return Response.json({
        document_kind,
        plate: null,
        plateFront: null,
        plateBack: null,
        make: null,
        model: null,
        side: 'unknown',
        tag_number: null,
        riders: [],
        authorized_pickups: [],
        unreadable: true,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
        reject_reason: reject_reason || 'not a vehicle or rider document',
      });
    }

    const primary =
      plateBack && plateFront && plateBack !== plateFront
        ? plateBack
        : plate || plateBack || plateFront || '';
    let unreadable = Boolean(parsed.unreadable);
    if (document_kind === 'vehicle_photo') {
      if (!primary) {
        unreadable = true;
        make = null;
        model = null;
      }
    }
    if (document_kind === 'hang_tag' && !primary && !tag_number) unreadable = true;

    return Response.json({
      document_kind,
      plate: document_kind === 'vehicle_photo' && unreadable ? null : primary || null,
      plateFront,
      plateBack,
      make,
      model,
      side,
      tag_number,
      riders,
      authorized_pickups,
      unreadable:
        document_kind === 'vehicle_photo'
          ? unreadable || !primary
          : Boolean(unreadable) && !tag_number && riders.length === 0 && !primary,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reject_reason: null,
    });
  } catch (err) {
    return Response.json(
      emptyResult({
        error: err instanceof Error ? err.message : 'LPR failed',
      }),
      { status: 200 },
    );
  }
}
