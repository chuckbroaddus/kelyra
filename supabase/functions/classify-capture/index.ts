import { extractJson, outputText, requireXaiKey, xaiResponses } from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  try {
    const body = await req.json();
    const apiKey = requireXaiKey();
    const imageUrl = String(body.imageUrl ?? '');
    if (!imageUrl) throw new Error('imageUrl required');
    const payload = await xaiResponses(apiKey, 'grok-4.6', [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: imageUrl, detail: 'high' },
          {
            type: 'input_text',
            text: `Classify this photo for a teacher. JSON only:
{"intent":"homework","confidence":0.0,"studentGuessId":null,"studentGuessName":null,"parentGuessName":null,"draftScore":null,"gaps":[{"label":"skill"}],"fields":[{"label":"field","value":"value"}],"names":[],"note":null}
intent is homework, portrait, parent_card, student_card, roster, or unsure. metadata aliases to student_card.
Never invent a student. Portrait is a face for a profile photo. parent_card / student_card are contact or emergency cards.`,
          },
        ],
      },
    ]);
    const parsed = extractJson(outputText(payload));
    const rawIntent = parsed.intent === 'metadata' ? 'student_card' : parsed.intent;
    const allowed = ['homework', 'portrait', 'parent_card', 'student_card', 'roster', 'unsure'];
    return Response.json({
      intent: allowed.includes(rawIntent) ? rawIntent : 'unsure',
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
