import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { asPass, homeworkDraftExists, imageDetailFor } from '../_shared/aiPolicy.ts';
import {
  homeworkPageAssetIdsForModel,
  isHomeworkPageImageMime,
  MAX_HOMEWORK_PAGE_IMAGES,
  mergePreservedPageAssetIds,
  pageAssetIdsFromDraft,
} from '../_shared/homeworkPages.ts';

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
    let apiKey: string;
    try {
      apiKey = requireXaiKey();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI key is not set';
      return json({ error: message }, 501);
    }

    const body = (await req.json()) as { captureId?: string; pass?: string; queue?: boolean };
    const { captureId } = body;
    const pass = asPass(body.pass);
    if (!captureId) return json({ error: 'captureId required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );

    const { data: capture, error: captureError } = await supabase
      .from('captures')
      .select('id, student_id, photo_asset_id, model_draft, class_id')
      .eq('id', captureId)
      .single();
    // Unnamed / unassigned must never call the model or insert skill_gaps.
    if (captureError || !capture?.student_id || !capture.photo_asset_id) {
      return json({ error: 'Capture must have a student and a photo' }, 400);
    }
    if (pass !== 'look-again' && homeworkDraftExists(capture.model_draft)) {
      return json({ ok: true, skipped: true, gaps: (capture.model_draft as { gaps?: unknown[] }).gaps ?? [] });
    }
    if (body.queue && pass !== 'look-again') {
      const { data: schoolId } = await supabase.rpc('my_school_id');
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('ai_jobs').insert({
        school_id: schoolId,
        teacher_id: userData.user?.id ?? null,
        capture_id: captureId,
        kind: 'homework_draft',
        pass: 'cheap',
        status: 'pending',
      });
      // Preserve pageAssetIds (batch multi-page) when marking pending — never wipe to {pending:true} alone.
      const priorIds = pageAssetIdsFromDraft(capture.model_draft);
      const queuedDraft = {
        pending: true as const,
        ...(priorIds.length ? { pageAssetIds: priorIds } : {}),
      };
      await supabase
        .from('captures')
        .update({ ai_status: 'pending', model_draft: queuedDraft })
        .eq('id', captureId);
      return json({ ok: true, queued: true });
    }

    const pageIds = homeworkPageAssetIdsForModel(capture);
    if (!pageIds.length) return json({ error: 'Photo asset missing' }, 400);

    const { data: assets, error: assetError } = await supabase
      .from('assets')
      .select('id, storage_path, mime_type')
      .in('id', pageIds);
    if (assetError || !assets?.length) return json({ error: 'Photo asset missing' }, 400);

    const byId = new Map(assets.map((row) => [row.id as string, row]));
    const imageUrls: string[] = [];
    for (const id of pageIds) {
      const asset = byId.get(id);
      if (!asset?.storage_path) continue;
      if (!isHomeworkPageImageMime(asset.mime_type as string | null)) {
        return json({ error: 'Homework analyze accepts page images only' }, 400);
      }
      // Sign from photos bucket only — never ingest/files PDF bytes.
      const { data: signed, error: signedError } = await supabase.storage
        .from('photos')
        .createSignedUrl(asset.storage_path as string, 120);
      if (signedError || !signed?.signedUrl) return json({ error: 'Could not sign photo URL' }, 500);
      imageUrls.push(signed.signedUrl);
      if (imageUrls.length >= MAX_HOMEWORK_PAGE_IMAGES) break;
    }
    if (!imageUrls.length) return json({ error: 'Photo asset missing' }, 400);

    const draft = await draftFromPhotos(supabase, apiKey, imageUrls, pass, captureId);
    const priorPageIds = pageAssetIdsFromDraft(capture.model_draft);
    const modelDraft = mergePreservedPageAssetIds(
      {
        ...draft,
        ...(priorPageIds.length ? { pageAssetIds: priorPageIds } : {}),
      },
      capture.model_draft,
    );

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
        model_draft: modelDraft,
        draft_score: draft.draftScore,
        teacher_note: draft.teacherNote,
        ai_status: 'done',
      })
      .eq('id', captureId);
    if (updateError) throw updateError;

    return json({ ok: true, gaps: draft.gaps });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'analyze failed';
    return json({ error: message }, 500);
  }
});

async function draftFromPhotos(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  imageUrls: string[],
  pass: 'cheap' | 'look-again',
  captureId: string,
) {
  const detail = imageDetailFor(pass);
  const content: Array<Record<string, unknown>> = [
    ...imageUrls.slice(0, MAX_HOMEWORK_PAGE_IMAGES).map((imageUrl) => ({
      type: 'input_image',
      image_url: imageUrl,
      detail,
    })),
    { type: 'input_text', text: prompt },
  ];
  const payload = await callMetered(supabase, apiKey, {
    job: 'homework',
    pass,
    functionName: 'analyze-homework',
    captureId,
    payload: [
      {
        role: 'user',
        content,
      },
    ],
  });
  const raw = outputText(payload);
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
    costUsd: typeof payload.__kelyraUsd === 'number' ? payload.__kelyraUsd : null,
    model: typeof payload.__kelyraModel === 'string' ? payload.__kelyraModel : null,
    pass,
  };
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
