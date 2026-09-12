import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { firstNameOnly, imageDetailFor } from '../_shared/aiPolicy.ts';

const ALLOWED = [
  'homework',
  'syllabus',
  'portrait',
  'parent_card',
  'student_card',
  'roster',
  'answer_key',
  'vehicle',
  'lesson_plan',
  'lesson_materials',
  'feed_photo',
  'unsure',
] as const;

type CaptureIntent = (typeof ALLOWED)[number];

function intentFromTeacherNote(teacherNote: string): CaptureIntent | null {
  if (!teacherNote) return null;
  if (/\b(answer\s*keys?|answer\s*sheet|key\s*for\s*(this\s+)?(quiz|test|homework|assignment)|keyed\s+assignment)\b/i.test(teacherNote)) {
    return 'answer_key';
  }
  if (/\b(license\s*plates?|number\s*plates?|car\s*plates?|vehicle|make\s*(and|&)\s*model|front\s*(and|&|\/)\s*back\s*plate|rider\s*check[- ]?in)\b/i.test(teacherNote)) {
    return 'vehicle';
  }
  if (/\b(lesson\s*plans?)\b/i.test(teacherNote)) return 'lesson_plan';
  if (/\b(lesson\s*materials?|class\s*materials?|teaching\s*materials?)\b/i.test(teacherNote)) {
    return 'lesson_materials';
  }
  if (/\b(feed\s*photos?|class\s*photos?|event\s*photos?|photo\s*for\s*(the\s+)?feed|post\s*(to\s*)?(the\s+)?feed)\b/i.test(teacherNote)) {
    return 'feed_photo';
  }
  if (/\b(syllabus|grading\s*policy|grade\s*weights?|category\s*weights?|how\s+(this\s+)?class\s+grades)\b/i.test(teacherNote)) {
    return 'syllabus';
  }
  return null;
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
    const apiKey = requireXaiKey();
    const imageUrl = String(body.imageUrl ?? '');
    if (!imageUrl) throw new Error('imageUrl required');
    const teacherNote = String(body.teacherNote ?? body.spokenName ?? body.note ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    const roster = Array.isArray(body.rosterFirstNames) ? body.rosterFirstNames : [];
    const rosterText = roster
      .map((row: unknown) => {
        if (typeof row === 'string') return firstNameOnly(row);
        const rec = row as { id?: string; name?: string };
        return rec.id ? `${rec.id} ${firstNameOnly(String(rec.name ?? ''))}` : firstNameOnly(String(rec.name ?? ''));
      })
      .filter(Boolean)
      .join(', ');
    const noteBlock = teacherNote
      ? `Teacher note / spoken text (strongly respect this — clear language overrides ambiguous photos):
${teacherNote}`
      : 'Teacher note / spoken text: (none)';
    const payload = await callMetered(supabase, apiKey, {
      job: 'classify',
      functionName: 'classify-capture',
      payload: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: imageUrl, detail: imageDetailFor('cheap') },
          {
            type: 'input_text',
            text: `Classify this photo for a teacher. JSON only:
{"intent":"homework","confidence":0.0,"studentGuessId":null,"studentGuessName":null,"parentGuessName":null,"draftScore":null,"gaps":[{"label":"skill"}],"fields":[{"label":"field","value":"value"}],"names":[],"note":null}
intent is homework, syllabus, portrait, parent_card, student_card, roster, answer_key, vehicle, lesson_plan, lesson_materials, feed_photo, or unsure. metadata aliases to student_card.
Never invent a student. Portrait is a face for a profile photo. parent_card / student_card are contact or emergency cards.
syllabus: class grading policy / category-weight sheet / "how this class grades" (not a student's filled worksheet). Prefer syllabus over homework when the page is policy weights. Assignment rubrics without class weights stay homework or unsure — not syllabus.
answer_key: teacher answer key / keyed worksheet answers for an assignment (filled or blank key), not a student's graded work to score.
vehicle: car / license plate photo(s) for Ride check-in — front and/or back plate; may include make/model visible on the vehicle.
lesson_plan: teacher lesson plan document (recognize only; surface may not ship yet).
lesson_materials: education lesson materials for a class landing (recognize only; surface may not ship yet).
feed_photo: class/event photograph meant for a feed post (recognize only; do not auto-post).
${noteBlock}
Roster first names only (id + first name). Guess only from this list:
${rosterText || '(none)'}`,
          },
        ],
      },
    ],
    });
    const parsed = extractJson(outputText(payload));
    const rawIntent = parsed.intent === 'metadata' ? 'student_card' : parsed.intent;
    let intent: CaptureIntent = (ALLOWED as readonly string[]).includes(rawIntent)
      ? (rawIntent as CaptureIntent)
      : 'unsure';
    const fromNote = intentFromTeacherNote(teacherNote);
    if (fromNote) intent = fromNote;
    return Response.json({
      intent,
      parentGuessName: typeof parsed.parentGuessName === 'string' ? parsed.parentGuessName : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      studentGuessId: typeof parsed.studentGuessId === 'string' ? parsed.studentGuessId : null,
      studentGuessName: typeof parsed.studentGuessName === 'string' ? parsed.studentGuessName : null,
      draftScore: typeof parsed.draftScore === 'number' ? parsed.draftScore : null,
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      fields: Array.isArray(parsed.fields) ? parsed.fields : [],
      names: Array.isArray(parsed.names) ? parsed.names : [],
      note: typeof parsed.note === 'string' ? parsed.note : null,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Classify failed' }, { status: 400 });
  }
});
