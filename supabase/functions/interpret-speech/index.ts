/** What the teacher said while capturing → intent / names. Ported from ai:dev. */
import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { speechPrompt } from '../_shared/aiPrompts.ts';
import { withCors } from '../_shared/cors.ts';
import { errorResponse, requireUserClient } from '../_shared/edgeAuth.ts';
import { finalizeSpeechIntent } from '../_shared/speechIntent.ts';

Deno.serve(
  withCors(async (req) => {
    try {
      const supabase = await requireUserClient(req);
      const body = await req.json().catch(() => ({}));
      const transcript = String(body.transcript ?? '').replace(/\s+/g, ' ').trim().slice(0, 2000);
      if (!transcript) throw new Error('transcript required');
      const payload = await callMetered(supabase, requireXaiKey(), {
        job: 'speech',
        functionName: 'interpret-speech',
        payload: `${speechPrompt}\n\nTeacher said:\n${transcript}`,
        extra: { responseMimeType: 'application/json' },
      });
      return Response.json(finalizeSpeechIntent(extractJson(outputText(payload))));
    } catch (err) {
      return errorResponse(err, 'Speech read failed');
    }
  }),
);
