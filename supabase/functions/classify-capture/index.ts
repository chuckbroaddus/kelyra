import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { firstNameOnly, imageDetailFor } from '../_shared/aiPolicy.ts';
import { cleanHomeworkStudentName } from '../_shared/homeworkGrading.ts';

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
  if (/\b(license\s*plates?|number\s*plates?|car\s*plates?|vehicle|make\s*(and|&)\s*model|front\s*(and|&|\/)\s*back\s*plate|rider\s*check[- ]?in|hang\s*tags?|car\s*tags?|authorized\s*pickup)\b/i.test(teacherNote)) {
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
            text: `Classify this photo for a teacher. JSON only (no markdown):
{"intent":"homework","confidence":0.0,"studentGuessId":null,"studentGuessName":null,"parentGuessName":null,"draftScore":null,"gaps":[],"fields":[],"names":[],"note":null}
intent is homework, syllabus, portrait, parent_card, student_card, roster, answer_key, vehicle, lesson_plan, lesson_materials, feed_photo, or unsure. metadata aliases to student_card.
Never invent a student. Never invent missing blank fields. Portrait is a face for a profile photo.
parent_card: parent/guardian contact card, family info form, directory contact row for an adult. Put the adult name in parentGuessName. Child name (if shown) in studentGuessName. fields = contact facts actually printed (use short labels): relationship, phone, email, address, preferred contact, notes. relationship values: mother|father|guardian|other. Copy phone digits as written. Multi-parent/sibling sheets and family/household directories with phone or email columns: parent_card, NOT roster (roster = a class name list with no contact columns); put every readable person in names[{name,confidence}]; primary adult still parentGuessName; do not invent phones for blank cells.
student_card: student emergency card, student data/information sheet, health card. studentGuessName = student. fields labels: preferred name|nickname, date of birth|birthday|dob, grade|age|grade or age, phone, email, address, emergency contact|emergency name, emergency phone, allergies, health conditions, notes. Leave fields empty when the cell is blank. Do not invent allergies/DOB/phone. Emergency contact: separate fields "emergency contact" (name only) and "emergency phone". A nickname in quotes or parentheses (Benjamin "Ben" Park) → preferred name field.
syllabus: class grading policy / category-weight sheet / "how this class grades" (not a student's filled worksheet). Prefer syllabus over homework when the page is policy weights. Assignment rubrics without class weights stay homework or unsure — not syllabus.
answer_key: teacher answer key / keyed worksheet answers for an assignment (filled or blank key), not a student's graded work to score.
vehicle: car / license plate photo(s), car-rider hang tag, rider check-in sheet, or authorized-pickup form for Ride — front and/or back plate; may include make/model, tag #, rider names.
lesson_plan: teacher lesson plan document (recognize only; surface may not ship yet).
lesson_materials: education lesson materials for a class landing (recognize only; surface may not ship yet).
feed_photo: class/event photograph meant for a feed post (recognize only; do not auto-post).
homework: student worksheets/quizzes/packets — not contact cards. No paper, document, or person in frame (empty desk, floor, wall) → unsure, confidence ≤0.3. A messy, cropped or nameless student page is still homework. studentGuessName is the name as written, or null when the name is blank/erased/cropped/unreadable — never placeholder text ("Name:", "[redacted]", "First Last", "unknown"). If more than one student's paper or name is in frame, put every readable student name in names[] (primary/front paper first).
fields must be real extracted pairs only. Never return placeholder label "field" or value "value". gaps only for homework skills (0-3); else [].
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
    const rawFields = Array.isArray(parsed.fields) ? parsed.fields : [];
    const fields = rawFields
      .map((field: { label?: unknown; value?: unknown }) => ({
        label: String(field?.label ?? '').trim(),
        value: String(field?.value ?? '').trim(),
      }))
      .filter((field: { label: string; value: string }) => {
        if (!field.label) return false;
        const ll = field.label.toLowerCase();
        const vv = field.value.toLowerCase();
        if (ll === 'field' && (vv === 'value' || !vv)) return false;
        if (ll === 'label' && vv === 'value') return false;
        return true;
      });
    const rawGaps = Array.isArray(parsed.gaps) ? parsed.gaps : [];
    const gaps = rawGaps
      .map((gap: { label?: unknown }) => ({ label: String(gap?.label ?? '').trim() }))
      .filter((gap: { label: string }) => gap.label && gap.label.toLowerCase() !== 'skill');
    return Response.json({
      intent,
      parentGuessName: typeof parsed.parentGuessName === 'string' ? parsed.parentGuessName.replace(/\s+/g, ' ').trim() || null : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      studentGuessId: typeof parsed.studentGuessId === 'string' ? parsed.studentGuessId : null,
      studentGuessName: cleanHomeworkStudentName(parsed.studentGuessName),
      draftScore: typeof parsed.draftScore === 'number' ? parsed.draftScore : null,
      gaps: intent === 'homework' ? gaps.slice(0, 3) : [],
      fields,
      names: Array.isArray(parsed.names)
        ? parsed.names
            .map((row: { name?: unknown; confidence?: unknown }) => ({
              name: cleanHomeworkStudentName(row?.name) ?? '',
              confidence: typeof row?.confidence === 'number' ? row.confidence : 0,
            }))
            .filter((row: { name: string }) => row.name)
            .slice(0, 40)
        : [],
      note: typeof parsed.note === 'string' ? parsed.note : null,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Classify failed' }, { status: 400 });
  }
});
