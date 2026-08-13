import { createClient } from 'npm:@supabase/supabase-js@2';

const xaiBaseUrl = 'https://api.x.ai/v1';
const visionModel = 'grok-4.6';

const prompt = `You are helping a K-12 teacher review one student's work.
Look only at the photo. Return JSON only, no markdown:
{"gaps":[{"label":"short skill name","sortOrder":1}],"draftScore":null,"teacherNote":"one short sentence or null"}
Rules:
- 1 to 3 gaps. Labels are short, like "two-digit regrouping" or "thesis clarity".
- If the image is blank, unreadable, or not student work, return {"gaps":[],"draftScore":null,"teacherNote":null}
- Do not invent a student name or extra biography.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const apiKey = Deno.env.get('XAI_API_KEY');
    if (!apiKey) return json({ error: 'XAI_API_KEY is not set' }, 501);

    const { captureId } = (await req.json()) as { captureId?: string };
    if (!captureId) return json({ error: 'captureId required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: capture, error: captureError } = await supabase
      .from('captures')
      .select('id, student_id, photo_asset_id')
      .eq('id', captureId)
      .single();
    if (captureError || !capture?.student_id || !capture.photo_asset_id) {
      return json({ error: 'Capture must have a student and a photo' }, 400);
    }

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('id', capture.photo_asset_id)
      .single();
    if (assetError || !asset) return json({ error: 'Photo asset missing' }, 400);

    const { data: signed, error: signedError } = await supabase.storage
      .from('photos')
      .createSignedUrl(asset.storage_path, 120);
    if (signedError || !signed?.signedUrl) return json({ error: 'Could not sign photo URL' }, 500);

    const draft = await draftFromPhoto(apiKey, signed.signedUrl);

    await supabase.from('skill_gaps').delete().eq('capture_id', captureId).eq('source', 'model');
    if (draft.gaps.length) {
      const { error: gapError } = await supabase.from('skill_gaps').insert(
        draft.gaps.map((gap, index) => ({
          capture_id: captureId,
          student_id: capture.student_id,
          label: gap.label,
          source: 'model',
          status: 'draft',
          sort_order: gap.sortOrder ?? index + 1,
        })),
      );
      if (gapError) throw gapError;
    }

    const { error: updateError } = await supabase
      .from('captures')
      .update({
        status: draft.gaps.length ? 'draft' : 'attached',
        model_draft: draft,
        draft_score: draft.draftScore,
        teacher_note: draft.teacherNote,
      })
      .eq('id', captureId);
    if (updateError) throw updateError;

    return json({ ok: true, gaps: draft.gaps });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analyze failed';
    return json({ error: message }, 500);
  }
});

async function draftFromPhoto(apiKey: string, imageUrl: string) {
  const response = await fetch(`${xaiBaseUrl}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: visionModel,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: imageUrl, detail: 'high' },
            { type: 'input_text', text: prompt },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`Vision failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };
  const raw =
    payload.output_text ??
    payload.output?.flatMap((item) => item.content ?? []).map((part) => part.text ?? '').join('') ??
    '';
  const parsed = extractJson(raw);
  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps
        .map((gap, index) => ({
          label: String((gap as { label?: string }).label ?? '').trim(),
          sortOrder: Number((gap as { sortOrder?: number }).sortOrder ?? index + 1),
        }))
        .filter((gap) => gap.label)
        .slice(0, 3)
    : [];
  return {
    gaps,
    draftScore:
      typeof parsed.draftScore === 'number' ? parsed.draftScore : null,
    teacherNote:
      typeof parsed.teacherNote === 'string' ? parsed.teacherNote : null,
  };
}

function extractJson(raw: string): {
  gaps?: unknown;
  draftScore?: unknown;
  teacherNote?: unknown;
} {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return {};
  try {
    return JSON.parse(raw.slice(start, end + 1)) as {
      gaps?: unknown;
      draftScore?: unknown;
      teacherNote?: unknown;
    };
  } catch {
    return {};
  }
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
