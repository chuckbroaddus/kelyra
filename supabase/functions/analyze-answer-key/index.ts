/** Teacher answer-key photo → keyed items + page signature for match-key. Ported from ai:dev. */
import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { analyzeKeyLookAgainPrompt, analyzeKeyPrompt } from '../_shared/aiPrompts.ts';
import { finalizeAnswerKeyAnalysis } from '../_shared/anskeySanitize.mjs';
import { withCors } from '../_shared/cors.ts';
import { errorResponse, requireUserClient } from '../_shared/edgeAuth.ts';
import { pageSignatureFromUrl } from '../_shared/pageSignatureEdge.ts';

Deno.serve(
  withCors(async (req) => {
    try {
      const supabase = await requireUserClient(req);
      const body = await req.json().catch(() => ({}));
      const imageUrl = String(body.imageUrl ?? '');
      if (!imageUrl) throw new Error('imageUrl required');
      const apiKey = requireXaiKey();
      // Signature (for later match-key) runs alongside the model read.
      const signatureP = pageSignatureFromUrl(imageUrl);
      const read = (text: string, pass: 'cheap' | 'look-again') =>
        callMetered(supabase, apiKey, {
          job: 'key',
          pass,
          functionName: 'analyze-answer-key',
          payload: [
            {
              role: 'user',
              content: [
                // Keys are small print (×/+, superscripts, "3 pts"): always high detail.
                { type: 'input_image', image_url: imageUrl, detail: 'high' },
                { type: 'input_text', text },
              ],
            },
          ],
          extra: { responseMimeType: 'application/json' },
        });
      const payload = await read(analyzeKeyPrompt, 'cheap');
      const signature = await signatureP;
      let finalized = finalizeAnswerKeyAnalysis(extractJson(outputText(payload)), signature);
      let model = payload.__kelyraModel ?? null;

      // Second pass on dense filled keys: catch glare guesses and sticky-note row shifts.
      const itemCount = Array.isArray(finalized.items) ? finalized.items.length : 0;
      if (!finalized.reject && itemCount >= 10 && finalized.pageState === 'filled') {
        try {
          const look = await read(analyzeKeyLookAgainPrompt, 'look-again');
          const second = finalizeAnswerKeyAnalysis(extractJson(outputText(look)), signature);
          if (!second.reject && Array.isArray(second.items) && second.items.length) {
            finalized = second;
            model = look.__kelyraModel ?? model;
          }
        } catch {
          // Keep first pass.
        }
      }
      return Response.json({ ...finalized, model });
    } catch (err) {
      return errorResponse(err, 'Answer key read failed');
    }
  }),
);
