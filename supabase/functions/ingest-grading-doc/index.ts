/**
 * GB-11 ingest-grading-doc — photo/PDF pages → IngestProposal (never publishes).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { isAllowedAskImageUrl } from '../_shared/askImageUrl.ts';
import { imageDetailFor } from '../_shared/aiPolicy.ts';

const SCHOOL_PATHS = new Set([
  'level', 'calendar.template', 'calendar.year_start', 'calendar.year_end', 'calendar.model',
  'calendar.period_model', 'credit.policy', 'credit.unit', 'credit.year_link', 'credit.attendance_gate',
  'credit.passing_threshold', 'rollup.preset', 'rollup.custom_weights', 'rollup.exam_enabled',
  'scale.default_id', 'scale.list', 'scale.bands', 'scale.passing_pct', 'scale.rounding',
  'qp.tables', 'qp.method', 'levels.list', 'gpa.mode', 'gpa.profiles', 'gpa.include', 'gpa.repeat',
  'locks.map', 'school.notes',
]);

const SYLLABUS_PATHS = new Set([
  'syllabus.title', 'syllabus.engine', 'syllabus.within_category', 'syllabus.categories',
  'syllabus.late_rule', 'syllabus.missing_rule', 'syllabus.extra_credit_method', 'syllabus.ec_cap',
  'syllabus.floor', 'syllabus.ceiling', 'syllabus.book_mode', 'syllabus.exam_weight',
  'syllabus.rollup_preset', 'syllabus.rounding', 'syllabus.empty_category', 'syllabus.narrative',
  'syllabus.term_structure',
]);

function clamp01(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function statusFor(conf: number, explicit: unknown): string {
  if (explicit === 'proposed' || explicit === 'needs_review' || explicit === 'unknown' || explicit === 'conflict') {
    return String(explicit);
  }
  if (conf >= 0.8) return 'proposed';
  if (conf >= 0.5) return 'needs_review';
  return 'unknown';
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

function syllabusPrompt(sourceId: string, classId: string): string {
  return `You extract a CLASS SYLLABUS grading contract from document page images.
Return JSON only. Paths must be from: ${[...SYLLABUS_PATHS].join(', ')}.
Shape: {"source_id":"${sourceId}","wizard":"syllabus","kind":"syllabus","document_kind_guess":"syllabus_policy|rubric|mixed|unknown","overall_confidence":0,"fields":[{"path":"syllabus.engine","value":"weighted_percent_inside","confidence":0.9,"evidence":{"quote":"...","page":1,"region":null},"status":"proposed"}],"ambiguities":[],"warnings":[]}
Rules: no student PII; no publish; no invented paths; partial fill ok; do not guess unreadable pages.
Class: ${classId}`;
}

function schoolPrompt(sourceId: string, schoolId: string): string {
  return `You extract a SCHOOL Grading and Reporting Policy from document page images.
Return JSON only. Paths must be from: ${[...SCHOOL_PATHS].join(', ')}.
Shape: {"source_id":"${sourceId}","wizard":"school","kind":"school_policy","document_kind_guess":"grading_policy|handbook|gpa_chart|unknown","overall_confidence":0,"fields":[{"path":"calendar.template","value":"tx_six_weeks","confidence":0.9,"evidence":{"quote":"...","page":1,"region":null},"status":"proposed"}],"ambiguities":[],"warnings":[]}
Rules: no student scores as stored grades; no publish; Texas templates are candidates not forced facts.
School: ${schoolId}`;
}

function normalizeProposal(
  parsed: Record<string, unknown>,
  kind: 'syllabus' | 'school_policy',
  sourceId: string,
): Record<string, unknown> {
  const wizard = kind === 'school_policy' ? 'school' : 'syllabus';
  const allow = kind === 'school_policy' ? SCHOOL_PATHS : SYLLABUS_PATHS;
  const fieldsIn = Array.isArray(parsed.fields) ? parsed.fields : [];
  const fields: unknown[] = [];
  const dropped: string[] = [];
  for (const row of fieldsIn) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const path = typeof o.path === 'string' ? o.path.trim() : '';
    if (!path) continue;
    if (!allow.has(path)) {
      dropped.push(path);
      continue;
    }
    const confidence = clamp01(o.confidence);
    const ev = o.evidence && typeof o.evidence === 'object' ? (o.evidence as Record<string, unknown>) : {};
    fields.push({
      path,
      value: o.value ?? null,
      confidence,
      evidence: {
        quote: typeof ev.quote === 'string' ? ev.quote.slice(0, 500) : '',
        page: typeof ev.page === 'number' ? Math.max(1, Math.floor(ev.page)) : null,
        region: typeof ev.region === 'string' ? ev.region : null,
      },
      status: statusFor(confidence, o.status),
      source_doc_id: sourceId,
    });
  }
  const warnings = Array.isArray(parsed.warnings) ? [...parsed.warnings] : [];
  if (dropped.length) {
    warnings.push({
      code: 'unknown_paths_dropped',
      message: `Dropped: ${dropped.slice(0, 12).join(', ')}`,
      severity: 'info',
    });
  }
  return {
    source_id: typeof parsed.source_id === 'string' ? parsed.source_id : sourceId,
    wizard,
    kind,
    fields,
    ambiguities: Array.isArray(parsed.ambiguities) ? parsed.ambiguities : [],
    warnings,
    document_kind_guess: typeof parsed.document_kind_guess === 'string' ? parsed.document_kind_guess : null,
    overall_confidence: clamp01(parsed.overall_confidence),
  };
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user?.id) return json({ error: 'Sign in to Kelyra first.' }, 401);

    const body = await req.json();
    const kind = body.kind === 'school_policy' ? 'school_policy' : body.kind === 'syllabus' ? 'syllabus' : null;
    if (!kind) return json({ error: 'kind must be syllabus or school_policy' }, 400);

    const classId =
      typeof body.class_id === 'string'
        ? body.class_id.trim()
        : typeof body.classId === 'string'
          ? body.classId.trim()
          : '';
    const schoolId =
      typeof body.school_id === 'string'
        ? body.school_id.trim()
        : typeof body.schoolId === 'string'
          ? body.schoolId.trim()
          : '';
    const storagePaths: string[] = Array.isArray(body.storage_paths)
      ? body.storage_paths.map(String).filter(Boolean)
      : Array.isArray(body.storagePaths)
        ? body.storagePaths.map(String).filter(Boolean)
        : [];
    const imageUrls: string[] = Array.isArray(body.image_urls)
      ? body.image_urls.map(String)
      : Array.isArray(body.imageUrls)
        ? body.imageUrls.map(String)
        : [];

    if (storagePaths.length + imageUrls.length === 0) {
      return json({ error: 'storage_paths or image_urls required' }, 400);
    }
    if (storagePaths.length + imageUrls.length > 20) {
      return json({ error: 'Max 20 pages or images per ingest.' }, 400);
    }

    if (kind === 'syllabus') {
      if (!classId) return json({ error: 'class_id required for syllabus ingest' }, 400);
      const { data: taught } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('class_id', classId)
        .eq('teacher_id', auth.user.id)
        .maybeSingle();
      if (!taught) return json({ error: 'You can only ingest a syllabus for a class you teach.' }, 403);
    } else {
      if (!schoolId) return json({ error: 'school_id required for school_policy ingest' }, 400);
      const { data: isAdmin } = await supabase.rpc('is_school_admin');
      const { data: mySchool } = await supabase.rpc('my_school_id');
      if (!isAdmin || mySchool !== schoolId) {
        return json({ error: 'Office administrators only for school policy ingest.' }, 403);
      }
    }

    for (const url of imageUrls) {
      if (!isAllowedAskImageUrl(url)) return json({ error: 'Image URL is not allowed.' }, 400);
    }

    const sourceId =
      typeof body.source_id === 'string' && body.source_id ? body.source_id : crypto.randomUUID();
    const prompt = kind === 'syllabus' ? syllabusPrompt(sourceId, classId) : schoolPrompt(sourceId, schoolId);

    let jobId: string | null = null;
    try {
      const { data: job } = await supabase
        .from('ingest_jobs')
        .insert({
          kind,
          owner: auth.user.id,
          class_id: kind === 'syllabus' ? classId : null,
          school_id: kind === 'school_policy' ? schoolId : null,
          source_paths: storagePaths.length ? storagePaths : imageUrls,
          status: 'running',
        })
        .select('id')
        .maybeSingle();
      jobId = job?.id ?? null;
    } catch {
      jobId = null;
    }

    const content: Array<Record<string, unknown>> = [];
    for (const url of imageUrls.slice(0, 20)) {
      content.push({ type: 'input_image', image_url: url, detail: imageDetailFor('cheap') });
    }
    content.push({
      type: 'input_text',
      text: `${prompt}\nStorage paths (page order):\n${
        storagePaths.map((p, i) => `${i + 1}. ${p}`).join('\n') || '(urls only)'
      }`,
    });

    const apiKey = requireXaiKey();
    try {
      const payload = await callMetered(supabase, apiKey, {
        job: 'classify',
        functionName: 'ingest-grading-doc',
        payload: [{ role: 'user', content }],
      });
      const parsed = extractJson(outputText(payload)) as Record<string, unknown>;
      const proposal = normalizeProposal(parsed, kind, sourceId);
      if (jobId) {
        await supabase.from('ingest_jobs').update({ status: 'proposed', proposal }).eq('id', jobId);
      }
      return json({ ok: true, job_id: jobId, proposal });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read this document.';
      const proposal = normalizeProposal(
        {
          source_id: sourceId,
          fields: [],
          warnings: [{ code: 'low_ocr', message, severity: 'block' }],
          overall_confidence: 0,
        },
        kind,
        sourceId,
      );
      if (jobId) {
        await supabase
          .from('ingest_jobs')
          .update({ status: 'failed', proposal, error_message: message })
          .eq('id', jobId);
      }
      return json({ ok: true, job_id: jobId, proposal });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'ingest-grading-doc failed';
    const status =
      message.includes('XAI_API_KEY') || message.includes('GEMINI_API_KEY') ? 501 : 400;
    return json({ error: message }, status);
  }
});
