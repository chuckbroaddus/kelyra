/**
 * GB-11 ingest-grading-doc — photo/PDF pages → IngestProposal (never publishes).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { isAllowedAskImageUrl } from '../_shared/askImageUrl.ts';
import { imageDetailFor } from '../_shared/aiPolicy.ts';
import { isAllowedPath } from '../_shared/ingestAllowedPaths.ts';
import {
  normalizeProposalFields,
  schoolProposalHasCore,
} from '../_shared/ingestNormalize.ts';
import {
  buildHandwritingTranscribePrompt,
  buildSchoolPolicyIngestPrompt,
  buildSchoolPolicyRetryPrompt,
  buildSyllabusIngestPrompt,
} from '../_shared/ingestPrompts.ts';
import type { IngestField, IngestProposal, IngestWarning } from '../_shared/ingestProposalTypes.ts';

function clamp01(n: unknown): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function statusFor(conf: number, explicit: unknown): string {
  if (
    explicit === 'proposed' ||
    explicit === 'needs_review' ||
    explicit === 'unknown' ||
    explicit === 'conflict'
  ) {
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

function parseEvidence(raw: unknown): { quote: string; page: number | null; region: string | null } {
  if (!raw || typeof raw !== 'object') return { quote: '', page: null, region: null };
  const o = raw as Record<string, unknown>;
  const quote =
    typeof o.quote === 'string'
      ? o.quote.slice(0, 500)
      : typeof o.text === 'string'
        ? o.text.slice(0, 500)
        : '';
  let page: number | null = null;
  if (typeof o.page === 'number' && Number.isFinite(o.page)) page = Math.max(1, Math.floor(o.page));
  const region = typeof o.region === 'string' ? o.region.slice(0, 120) : null;
  return { quote, page, region };
}

function skeletonProposal(
  kind: 'syllabus' | 'school_policy',
  sourceId: string,
  parsed: Record<string, unknown>,
): IngestProposal {
  const wizard = kind === 'school_policy' ? 'school' : 'syllabus';
  const fieldsIn = Array.isArray(parsed.fields) ? parsed.fields : [];
  const fields: IngestField[] = [];
  const dropped: string[] = [];
  for (const row of fieldsIn) {
    if (!row || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const path = typeof o.path === 'string' ? o.path.trim() : '';
    if (!path) continue;
    if (!isAllowedPath(wizard, path)) {
      dropped.push(path);
      continue;
    }
    const confidence = clamp01(o.confidence);
    fields.push({
      path,
      value: o.value ?? null,
      confidence,
      evidence: parseEvidence(o.evidence),
      status: statusFor(confidence, o.status) as IngestField['status'],
      source_doc_id: sourceId,
    });
  }
  const warnings: IngestWarning[] = Array.isArray(parsed.warnings)
    ? (parsed.warnings as IngestWarning[])
    : [];
  if (dropped.length) {
    warnings.push({
      code: 'unknown_paths_dropped',
      message: `Dropped: ${dropped.slice(0, 12).join(', ')}`,
      severity: 'info',
    });
  }
  const base: IngestProposal = {
    source_id: typeof parsed.source_id === 'string' ? parsed.source_id : sourceId,
    wizard,
    kind,
    fields,
    ambiguities: Array.isArray(parsed.ambiguities)
      ? (parsed.ambiguities as IngestProposal['ambiguities'])
      : [],
    warnings,
    document_kind_guess:
      typeof parsed.document_kind_guess === 'string' ? parsed.document_kind_guess : null,
    overall_confidence: clamp01(parsed.overall_confidence),
  };
  return normalizeProposalFields(base);
}

async function callModel(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  content: Array<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const payload = await callMetered(supabase, apiKey, {
    job: 'classify',
    functionName: 'ingest-grading-doc',
    payload: [{ role: 'user', content }],
  });
  const parsed = extractJson(outputText(payload));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

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
    const kind =
      body.kind === 'school_policy' ? 'school_policy' : body.kind === 'syllabus' ? 'syllabus' : null;
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
    const prompt =
      kind === 'syllabus'
        ? buildSyllabusIngestPrompt({ class_id: classId, source_id: sourceId })
        : buildSchoolPolicyIngestPrompt({ school_id: schoolId, source_id: sourceId });

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

    const imageContent: Array<Record<string, unknown>> = [];
    for (const url of imageUrls.slice(0, 20)) {
      imageContent.push({ type: 'input_image', image_url: url, detail: imageDetailFor('cheap') });
    }
    const pathNote =
      'Storage paths (page order):\n' +
      (storagePaths.map((p, i) => `${i + 1}. ${p}`).join('\n') || '(urls only)');

    const apiKey = requireXaiKey();
    try {
      // Two-pass for images: transcribe first (handwriting / low quality), then extract.
      let transcriptNote = '';
      if (imageContent.length > 0) {
        try {
          const trParsed = await callModel(supabase, apiKey, [
            ...imageContent,
            { type: 'input_text', text: buildHandwritingTranscribePrompt() },
          ]);
          const transcript =
            typeof trParsed.transcript === 'string' ? trParsed.transcript.trim() : '';
          const quality = typeof trParsed.quality === 'string' ? trParsed.quality : '';
          if (transcript) {
            transcriptNote =
              `\nWorking transcript (${quality || 'unknown'} quality) — extract ONLY facts supported below; quotes must still match the page:\n` +
              transcript.slice(0, 8000);
          } else if (quality === 'unreadable') {
            transcriptNote =
              '\nTranscript empty / unreadable. Prefer empty fields + block warning over guesses.';
          }
        } catch {
          // transcription optional — fall through to single-pass extract
        }
      }

      let parsed = await callModel(supabase, apiKey, [
        ...imageContent,
        { type: 'input_text', text: prompt + '\n' + pathNote + transcriptNote },
      ]);
      let proposal = skeletonProposal(kind, sourceId, parsed);

      // Handbook empty / missing core → one stricter retry
      if (kind === 'school_policy' && !schoolProposalHasCore(proposal)) {
        const retryPrompt = buildSchoolPolicyRetryPrompt({
          school_id: schoolId,
          source_id: sourceId,
        });
        parsed = await callModel(supabase, apiKey, [
          ...imageContent,
          { type: 'input_text', text: retryPrompt + '\n' + pathNote + transcriptNote },
        ]);
        proposal = skeletonProposal(kind, sourceId, parsed);
        proposal.warnings = [
          ...proposal.warnings,
          {
            code: 'school_core_retry',
            message: 'Retried school policy extract with stricter core-field prompt.',
            severity: 'info',
          },
        ];
      }

      // Syllabus weak / handwriting: retry when thin extract and we have images.
      // Never retry over a blocked wrong-document / mixed empty proposal — the
      // second pass tends to invent title/late_rule from menus and flyers (N02/N04).
      const blockedEmpty =
        proposal.fields.filter((f) => f.value != null && f.value !== '').length === 0 &&
        (proposal.warnings || []).some(
          (w) =>
            w &&
            w.severity === 'block' &&
            /not_a_syllabus|not_a_handbook|mixed_document|low_ocr|wrong_document/i.test(
              `${w.code ?? ''} ${w.message ?? ''}`,
            ),
        );
      if (
        kind === 'syllabus' &&
        !blockedEmpty &&
        proposal.fields.filter((f) => f.value != null).length < 4 &&
        imageContent.length > 0 &&
        transcriptNote
      ) {
        parsed = await callModel(supabase, apiKey, [
          ...imageContent,
          {
            type: 'input_text',
            text:
              prompt +
              '\n' +
              pathNote +
              transcriptNote +
              '\nSTRICT handwriting pass: Use the transcript. Emit every category/late/missing/retake/narrative fact the transcript supports with verbatim quotes. Map missing-work floor → syllabus.missing_rule. Map "replaces the old" → syllabus.retake method replace. If the transcript is clearly not a syllabus, empty fields[] + block not_a_syllabus — do not invent.',
          },
        ]);
        const retryProp = skeletonProposal(kind, sourceId, parsed);
        const filled = (p: IngestProposal) => p.fields.filter((f) => f.value != null).length;
        const retryBlocked = (retryProp.warnings || []).some(
          (w) => w?.severity === 'block' && /not_a_syllabus|mixed_document/i.test(`${w.code ?? ''}`),
        );
        if (retryBlocked && filled(retryProp) === 0) {
          proposal = retryProp;
          proposal.warnings = [
            ...proposal.warnings,
            {
              code: 'handwriting_retry',
              message: 'Retried extract using page transcription.',
              severity: 'info',
            },
          ];
        } else if (!retryBlocked && filled(retryProp) >= filled(proposal)) {
          proposal = retryProp;
          proposal.warnings = [
            ...proposal.warnings,
            {
              code: 'handwriting_retry',
              message: 'Retried extract using page transcription.',
              severity: 'info',
            },
          ];
        }
      }

      if (jobId) {
        await supabase.from('ingest_jobs').update({ status: 'proposed', proposal }).eq('id', jobId);
      }
      return json({ ok: true, job_id: jobId, proposal });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not read this document.';
      const proposal = skeletonProposal(
        kind,
        sourceId,
        {
          source_id: sourceId,
          fields: [],
          warnings: [{ code: 'low_ocr', message, severity: 'block' }],
          overall_confidence: 0,
        },
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