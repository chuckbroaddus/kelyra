import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import {
  buildPracticeLessonHtml,
  parsePracticePageSpec,
  practiceBeatWindow,
  specFromItems,
  PRACTICE_PAGE_STYLE_PROMPT,
} from '../_shared/practicePage.ts';

type PracticeItem = { id?: string; prompt: string; answerKey?: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors() });
  }

  try {
    const apiKey = requireXaiKey();
    const body = (await req.json()) as {
      classId?: string;
      studentId?: string;
      sourceAssignmentId?: string;
      title?: string;
      skillLabel?: string;
      items?: PracticeItem[];
      assignmentId?: string;
      instruction?: string;
    };
    const classId = String(body.classId ?? '').trim();
    const items = (body.items ?? []).map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      prompt: String(item.prompt ?? '').trim(),
      ...(item.answerKey?.trim() ? { answerKey: item.answerKey.trim() } : {}),
    })).filter((item) => item.prompt);
    if (!classId || !items.length) return json({ error: 'classId and items required' }, 400);

    const user = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    );
    const { data: auth } = await user.auth.getUser();
    if (!auth.user?.id) return json({ error: 'Sign in first.' }, 401);
    const { data: taught } = await user
      .from('class_teachers')
      .select('class_id')
      .eq('class_id', classId)
      .eq('teacher_id', auth.user.id)
      .maybeSingle();
    if (!taught) return json({ error: 'You can only assign to a class you teach.' }, 403);

    const fallback = specFromItems(
      String(body.title ?? '').trim() || `Practice: ${body.skillLabel ?? 'skill'}`,
      items,
    );
    let spec = fallback;
    try {
      const payload = await callMetered(user, apiKey, {
        job: 'lesson-outline',
        functionName: 'build-practice-lesson',
        payload: `${PRACTICE_PAGE_STYLE_PROMPT}

Skill: ${String(body.skillLabel ?? fallback.title)}
Source assignment: ${String(body.title ?? '')}
${body.instruction ? `Teacher revision: ${body.instruction}\n` : ''}Questions:
${items.map((item, index) => `${index + 1}. ${item.prompt}${item.answerKey ? ` (key: ${item.answerKey})` : ''}`).join('\n')}`,
      });
      spec = parsePracticePageSpec(extractJson(outputText(payload)), fallback);
    } catch {
      spec = fallback;
    }
    if (!spec.beats.length) spec = fallback;
    const html = buildPracticeLessonHtml(spec);
    const window = practiceBeatWindow(spec);
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!serviceKey) return json({ error: 'Practice pages need the service role to store in lessons.' }, 501);
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
    let deckId = `prac-${crypto.randomUUID()}`;
    let version = 'v1';
    const assignmentId = String(body.assignmentId ?? '').trim();
    if (assignmentId) {
      const { data: assignment } = await user
        .from('assignments')
        .select('id, class_id, deck_id, lesson_version, storage_deck_id')
        .eq('id', assignmentId)
        .maybeSingle();
      if (!assignment || assignment.class_id !== classId) return json({ error: 'Assignment not found.' }, 404);
      if (assignment.storage_deck_id?.startsWith('prac-') || assignment.deck_id?.startsWith('prac-')) {
        deckId = assignment.storage_deck_id || assignment.deck_id;
        version = assignment.lesson_version || 'v1';
      }
    }
    const object = `${deckId}/${version}/index.html`;
    const uploaded = await fetch(
      `${(Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')}/storage/v1/object/lessons/${object}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'text/html; charset=utf-8',
          'x-upsert': 'true',
        },
        body: html,
      },
    );
    if (!uploaded.ok) return json({ error: await uploaded.text() }, 502);
    if (!assignmentId) {
      const { error: packError } = await admin.from('lesson_packs').insert({
        deck_id: deckId,
        version,
        title: spec.title,
        published: false,
        storage_deck_id: deckId,
        beat_start: window.start,
        beat_end: window.end,
      });
      if (packError) return json({ error: packError.message }, 500);
    } else {
      await admin
        .from('lesson_packs')
        .update({ title: spec.title, beat_start: window.start, beat_end: window.end })
        .eq('deck_id', deckId)
        .eq('version', version);
    }
    return json({
      ok: true,
      deckId,
      version,
      storageDeckId: deckId,
      beatStart: window.start,
      beatEnd: window.end,
      title: spec.title,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'build-practice-lesson failed';
    const status = message.includes('XAI_API_KEY') ? 501 : 500;
    return json({ error: message }, status);
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
