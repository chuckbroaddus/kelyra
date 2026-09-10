import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { canPublish } from '../_shared/publishLessonPackPolicy.ts';

const PROMPT = `You draft a STUDENT-SAFE pedagogy pack (tutor brief) for one Kelyra assignment.
Return JSON only:
{"objectives":["..."],"misconceptions":["..."],"allowed_hint_depth":"next-step"|"conceptual"|"scaffolding","vocabulary":["..."]}

Hard rules:
- Student-safe only. No answer keys, worked solutions, final answers, or "write this" stems.
- No teacher-only notes. No explain_draft.
- Keep the whole JSON under ~800 tokens (short lists; 2–5 bullets each).
- allowed_hint_depth: next-step = nudge the next move; conceptual = idea check; scaffolding = lighter structure for practice (still no answers on graded work).
- Use only the assignment metadata given. Do not invent keys.`;

function asStringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? '').trim()).filter(Boolean).slice(0, max);
}

function asDepth(value: unknown): 'next-step' | 'conceptual' | 'scaffolding' {
  if (value === 'conceptual' || value === 'scaffolding' || value === 'next-step') return value;
  return 'next-step';
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
    if (authError || !auth.user?.id) {
      return json({ error: 'Sign in to Kelyra first.' }, 401);
    }

    const body = await req.json();
    const assignmentId = String(body.assignmentId ?? '').trim();
    if (!assignmentId) return json({ error: 'assignmentId required' }, 400);

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, also_teacher, also_administrator, parent_id')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (!profile?.role) return json({ error: 'Sign in to Kelyra first.' }, 401);
    // Teacher desk wall: teacher | also_teacher | office — then teaches_class (incl. school admin).
    if (!canPublish(profile)) {
      return json({ error: 'Only teachers can draft a tutor brief.' }, 403);
    }

    const { data: assignment, error: asgError } = await supabase
      .from('assignments')
      .select('id, class_id, title, category, unit, section, kind, deck_id, lesson_version')
      .eq('id', assignmentId)
      .maybeSingle();
    if (asgError || !assignment?.id) return json({ error: 'Assignment not found.' }, 404);

    const { data: teaches } = await supabase.rpc('teaches_class', { p_class_id: assignment.class_id });
    if (!teaches) {
      return json({ error: 'You can only draft a tutor brief for a class you teach.' }, 403);
    }

    // Metadata only — never key answers / explain_draft.
    const meta = [
      `title=${assignment.title ?? ''}`,
      `category=${assignment.category ?? ''}`,
      `unit=${assignment.unit ?? ''}`,
      `section=${assignment.section ?? ''}`,
      `kind=${assignment.kind ?? ''}`,
      assignment.deck_id ? `deck=${assignment.deck_id}` : null,
      assignment.lesson_version ? `lesson_version=${assignment.lesson_version}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const apiKey = requireXaiKey();
    const payload = await callMetered(supabase, apiKey, {
      job: 'ask',
      functionName: 'generate-tutor-brief',
      payload: [
        {
          role: 'user',
          content: `${PROMPT}\n\nAssignment metadata:\n${meta}`,
        },
      ],
    });
    const parsed = extractJson(outputText(payload));
    const objectives = asStringList(parsed.objectives);
    const misconceptions = asStringList(parsed.misconceptions);
    const vocabulary = asStringList(parsed.vocabulary);
    const allowedHintDepth = asDepth(parsed.allowed_hint_depth);

    if (!objectives.length && !misconceptions.length && !vocabulary.length) {
      return json({ error: 'Couldn’t draft a brief. Try re-generate, or skip for now.' }, 502);
    }

    const { data: brief, error: upsertError } = await supabase.rpc('upsert_tutor_brief_draft', {
      p_assignment_id: assignmentId,
      p_objectives: objectives,
      p_misconceptions: misconceptions,
      p_allowed_hint_depth: allowedHintDepth,
      p_vocabulary: vocabulary,
      p_teacher_notes: null,
      p_as_new_draft: true,
    });
    if (upsertError) {
      return json({ error: upsertError.message || 'Could not save tutor brief draft.' }, 400);
    }

    return json({ brief });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'generate-tutor-brief failed';
    const status =
      message.includes('XAI_API_KEY') || message.includes('GEMINI_API_KEY') ? 501 : 500;
    return json({ error: message }, status);
  }
});
