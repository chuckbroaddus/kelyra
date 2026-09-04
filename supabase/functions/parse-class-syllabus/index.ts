import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { isAllowedAskImageUrl } from '../_shared/askImageUrl.ts';
import { imageDetailFor } from '../_shared/aiPolicy.ts';

const SYLLABUS_PARSE_PROMPT = `You extract a CLASS GRADING POLICY (syllabus weights) from a photo for a teacher.
Return JSON only, no markdown, schema_version 1:
{
  "schema_version": 1,
  "document_kind": "syllabus_policy|rubric|mixed|unknown",
  "document_kind_confidence": 0.0,
  "warnings": [{"code":"string","message":"string","severity":"info|warn|block"}],
  "title": {"value":"string|null","confidence":0.0,"selected":true},
  "term_structure": {"value":"quarters|semesters|year|custom|null","confidence":0.0,"selected":true},
  "categories": [{
    "label": {"value":"Tests","confidence":0.0,"selected":true},
    "key": {"value":"test","confidence":0.0,"selected":true},
    "weight_percent": {"value":40,"confidence":0.0,"selected":true},
    "default_include_in_average": {"value":false,"confidence":1.0,"selected":true}
  }],
  "policies": {
    "missing_as_zero": {"value":false,"confidence":1.0,"selected":true},
    "rounding": {"value":"nearest_whole","confidence":1.0,"selected":true},
    "publish_to_family": {"value":true,"confidence":1.0,"selected":true}
  },
  "rubric_draft": {"present":false,"criteria":[]},
  "ocr_notes": null,
  "overall_confidence": 0.0
}
Hard rules:
- Classify document_kind first. Rubric criteria must NEVER become category weights.
- Extract % weights only from grading-policy / final-grade tables.
- Prefer keys: homework, quiz, test, midterm, final, project, presentation, participation, behavior, other.
- Always default_include_in_average=false. Never set true because key is quiz/test.
- missing_as_zero default false. Do not invent 40/60 defaults. If unreadable, empty categories + warning.
- No roster, SIS ids, IEP text, or student score tables in categories.
- If the page is a grade list / student-filled rubric, document_kind=unknown or rubric with empty categories.`;

function normalizeSyllabusDraft(parsed: Record<string, unknown>, classId: string) {
  const kind = ['syllabus_policy', 'rubric', 'mixed', 'unknown'].includes(String(parsed?.document_kind ?? ''))
    ? String(parsed.document_kind)
    : 'unknown';
  const categories = Array.isArray(parsed?.categories) ? parsed.categories : [];
  const forced = categories.map((rowUnknown, index) => {
    const row = rowUnknown as Record<string, unknown>;
    const labelObj = row?.label as { value?: string; confidence?: number } | string | undefined;
    const keyObj = row?.key as { value?: string; confidence?: number } | string | undefined;
    const weightObj = row?.weight_percent as { value?: number; confidence?: number } | number | undefined;
    const label =
      typeof labelObj === 'string'
        ? labelObj
        : typeof labelObj?.value === 'string'
          ? labelObj.value
          : `Category ${index + 1}`;
    const keyRaw =
      typeof keyObj === 'string' ? keyObj : typeof keyObj?.value === 'string' ? keyObj.value : 'other';
    const weight = typeof weightObj === 'number' ? weightObj : Number(weightObj?.value ?? 0);
    const conf =
      typeof weightObj === 'object' && typeof weightObj?.confidence === 'number'
        ? weightObj.confidence
        : typeof labelObj === 'object' && typeof labelObj?.confidence === 'number'
          ? labelObj.confidence
          : 0.5;
    const selected = conf >= 0.55 && kind !== 'rubric';
    return {
      temp_id: `c${index + 1}`,
      label: { value: label, confidence: conf, selected },
      key: {
        value: String(keyRaw).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'other',
        confidence: conf,
        selected,
      },
      weight_percent: { value: Number.isFinite(weight) ? weight : 0, confidence: conf, selected },
      default_include_in_average: { value: false, confidence: 1, selected: true },
    };
  });

  return {
    schema_version: 1,
    class_id: classId,
    document_kind: kind,
    document_kind_confidence:
      typeof parsed?.document_kind_confidence === 'number' ? parsed.document_kind_confidence : 0,
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
    title: parsed?.title ?? { value: null, confidence: 0, selected: false },
    term_structure: parsed?.term_structure ?? { value: 'year', confidence: 0, selected: true },
    categories: kind === 'rubric' ? [] : forced,
    policies: {
      ...(parsed?.policies && typeof parsed.policies === 'object'
        ? (parsed.policies as Record<string, unknown>)
        : {}),
      missing_as_zero: { value: false, confidence: 1, selected: true },
      rounding: { value: 'nearest_whole', confidence: 1, selected: true },
      publish_to_family: { value: true, confidence: 1, selected: true },
    },
    rubric_draft: parsed?.rubric_draft ?? { present: kind === 'rubric' || kind === 'mixed', criteria: [] },
    ocr_notes: typeof parsed?.ocr_notes === 'string' ? parsed.ocr_notes : null,
    overall_confidence: typeof parsed?.overall_confidence === 'number' ? parsed.overall_confidence : 0,
    status: 'proposed',
  };
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
    const classId = String(body.classId ?? '').trim();
    const imageUrl = String(body.imageUrl ?? '');
    if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });
    if (!imageUrl) return Response.json({ error: 'imageUrl required' }, { status: 400 });
    if (!isAllowedAskImageUrl(imageUrl)) {
      return Response.json({ error: 'Image URL is not allowed.' }, { status: 400 });
    }

    // Taught-class check BEFORE vendor call (no office-wide parse).
    const { data: taught } = await supabase
      .from('class_teachers')
      .select('class_id')
      .eq('class_id', classId)
      .eq('teacher_id', auth.user.id)
      .maybeSingle();
    if (!taught) {
      return Response.json({ error: 'You can only parse a syllabus for a class you teach.' }, { status: 403 });
    }

    const apiKey = requireXaiKey();
    try {
      const payload = await callMetered(supabase, apiKey, {
        job: 'classify',
        functionName: 'parse-class-syllabus',
        payload: [
          {
            role: 'user',
            content: [
              { type: 'input_image', image_url: imageUrl, detail: imageDetailFor('cheap') },
              { type: 'input_text', text: SYLLABUS_PARSE_PROMPT },
            ],
          },
        ],
      });
      const parsed = extractJson(outputText(payload)) as Record<string, unknown>;
      // Never publish here — draft JSON only.
      return Response.json(normalizeSyllabusDraft(parsed, classId));
    } catch (err) {
      return Response.json({
        schema_version: 1,
        class_id: classId,
        document_kind: 'unknown',
        document_kind_confidence: 0,
        categories: [],
        policies: {
          missing_as_zero: { value: false, confidence: 1, selected: true },
          rounding: { value: 'nearest_whole', confidence: 1, selected: true },
          publish_to_family: { value: true, confidence: 1, selected: true },
        },
        warnings: [
          {
            code: 'low_ocr',
            message: err instanceof Error ? err.message : 'Could not read this page.',
            severity: 'block',
          },
        ],
        overall_confidence: 0,
        status: 'proposed',
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Parse failed';
    const status =
      message.includes('XAI_API_KEY') || message.includes('GEMINI_API_KEY') ? 501 : 400;
    return Response.json({ error: message }, { status });
  }
});
