/** Class list / seating chart / attendance photo → student names. Ported from ai:dev. */
import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { rosterPrompt } from '../_shared/aiPrompts.ts';
import { withCors } from '../_shared/cors.ts';
import { errorResponse, requireUserClient } from '../_shared/edgeAuth.ts';
import { finalizeRosterExtract } from '../_shared/rosterExtract.ts';

Deno.serve(
  withCors(async (req) => {
    try {
      const supabase = await requireUserClient(req);
      const body = await req.json().catch(() => ({}));
      const imageUrl = String(body.imageUrl ?? '');
      if (!imageUrl) throw new Error('imageUrl required');
      const payload = await callMetered(supabase, requireXaiKey(), {
        job: 'roster',
        functionName: 'extract-roster',
        payload: [
          {
            role: 'user',
            content: [
              // Roster names are dense small text; low detail invents OCR ghosts.
              { type: 'input_image', image_url: imageUrl, detail: 'high' },
              { type: 'input_text', text: rosterPrompt },
            ],
          },
        ],
        extra: { responseMimeType: 'application/json' },
      });
      const result = finalizeRosterExtract(extractJson(outputText(payload)));
      return Response.json({ ...result, model: payload.__kelyraModel ?? null });
    } catch (err) {
      return errorResponse(err, 'Roster read failed');
    }
  }),
);
