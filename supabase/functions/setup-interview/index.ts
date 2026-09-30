/**
 * GB-12 setup-interview edge: one turn in → extracted slots + next question.
 * Never publishes. Auth: teacher-of-class or office admin.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';

// Inline minimal turn helpers — pure graph lives client-side; edge uses model + auth.
// Session blob is opaque jsonb; model only returns ExtractionResult JSON.

const SYSTEM = `You extract grading-setup slots for a Kelyra school or syllabus interview.
Return JSON only, no markdown:
{
  "turn_kind": "slot_answer|side_question|navigation|injection",
  "slots": [{"path":"string","value":...,"confidence":0.0,"evidence":"quote"}],
  "side_topic_key": "help.* or null",
  "navigation": "open_form|start_over|confirm|photo|null",
  "restate": "one sentence or null",
  "raw_summary": "short"
}
Rules:
- Extract every matching slot. six-weeks→calendar.template tx_six_weeks.
- 70 passing→scale.default_id texas_no_d + scale.passing_pct 70.
- AP is 5.0→gpa.mode unweighted_and_weighted, levels.ap_points 5, gpa.weighted_bonus numeric_5.
- Side questions (what if, explain) → side_question, slots [].
- Never invent engines outside enums. Never write scores. Never publish.`;

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
    const userId = auth.user.id;

    const body = await req.json();
    const kind = String(body.kind ?? body.wizard ?? '').trim();
    if (kind !== 'school' && kind !== 'syllabus') {
      return Response.json({ error: 'kind must be school or syllabus' }, { status: 400 });
    }
    const classId = body.classId ? String(body.classId).trim() : '';
    const schoolId = body.schoolId ? String(body.schoolId).trim() : '';
    const userText = String(body.userText ?? body.message ?? '').trim();
    const chipId = body.chipId != null ? String(body.chipId) : null;
    const session = body.session && typeof body.session === 'object' ? body.session : null;
    const promptExtra = typeof body.prompt === 'string' ? body.prompt : '';

    if (kind === 'syllabus') {
      if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });
      const { data: taught } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('class_id', classId)
        .eq('teacher_id', userId)
        .maybeSingle();
      if (!taught) {
        return Response.json({ error: 'You can only interview a class you teach.' }, { status: 403 });
      }
    } else {
      if (!schoolId) return Response.json({ error: 'schoolId required' }, { status: 400 });
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, school_id, role, also_administrator')
        .eq('id', userId)
        .maybeSingle();
      const office =
        profile &&
        (profile.role === 'administrator' ||
          profile.role === 'superintendent' ||
          profile.also_administrator === true);
      if (!office || profile?.school_id !== schoolId) {
        return Response.json({ error: 'Office admin of this school required.' }, { status: 403 });
      }
    }

    // Chip-only turns: no model needed — client applies heuristic; edge echoes.
    if (chipId && !userText) {
      return Response.json({
        ok: true,
        mode: 'chip',
        chipId,
        extraction: null,
        session,
        note: 'Client applies chip slots locally; no model call.',
      });
    }

    if (!userText && !chipId) {
      return Response.json({ error: 'userText or chipId required' }, { status: 400 });
    }

    const apiKey = requireXaiKey();
    const pending = session?.pending_node ?? null;
    const filled = session?.filled ? JSON.stringify(session.filled) : '{}';
    const userPrompt =
      promptExtra ||
      `${SYSTEM}

kind=${kind}
pending_node=${pending}
filled=${filled}
chipId=${chipId ?? ''}
User: ${userText || chipId}`;

    try {
      const payload = await callMetered(supabase, apiKey, {
        job: 'classify',
        functionName: 'setup-interview',
        payload: [{ role: 'user', content: [{ type: 'input_text', text: userPrompt }] }],
      });
      const parsed = extractJson(outputText(payload)) as Record<string, unknown>;
      // Draft-only — never publish from this function.
      return Response.json({
        ok: true,
        mode: 'model',
        extraction: parsed,
        kind,
        classId: classId || null,
        schoolId: schoolId || null,
        status: 'proposed',
      });
    } catch (err) {
      return Response.json({
        ok: false,
        mode: 'model_error',
        error: err instanceof Error ? err.message : 'Model failed',
        extraction: {
          turn_kind: 'slot_answer',
          slots: [],
          restate: null,
          navigation: null,
        },
        status: 'proposed',
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Interview turn failed';
    const status =
      message.includes('XAI_API_KEY') || message.includes('GEMINI_API_KEY') ? 501 : 400;
    return Response.json({ error: message }, { status });
  }
});
