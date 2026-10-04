/** Student work pages (+ optional answer key) → items, score, gaps, name. Ported from ai:dev. */
import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { asPass } from '../_shared/aiPolicy.ts';
import { withCors } from '../_shared/cors.ts';
import { errorResponse, requireUserClient } from '../_shared/edgeAuth.ts';
import { evaluatePromptText, finalizeEvaluateHomework } from '../_shared/evaluateHomework.ts';

Deno.serve(
  withCors(async (req) => {
    try {
      const supabase = await requireUserClient(req);
      const body = await req.json().catch(() => ({}));
      const pass = asPass(body.pass);
      const urls: string[] = (Array.isArray(body.imageUrls) ? body.imageUrls : [body.imageUrl])
        .map((url: unknown) => String(url ?? ''))
        .filter(Boolean)
        .slice(0, 8);
      if (!urls.length) throw new Error('imageUrl required');
      const keyUrls: string[] = Array.isArray(body.keyImageUrls)
        ? body.keyImageUrls.map((url: unknown) => String(url ?? '')).filter(Boolean).slice(0, 3)
        : [];
      // Homework always reads at high detail: rough phone photos lose digits/units at low.
      const images = [...urls, ...keyUrls].map((url) => ({ type: 'input_image', image_url: url, detail: 'high' }));
      const payload = await callMetered(supabase, requireXaiKey(), {
        job: 'homework',
        pass,
        functionName: 'evaluate-homework',
        payload: [
          {
            role: 'user',
            content: [...images, { type: 'input_text', text: evaluatePromptText(body, keyUrls.length > 0) }],
          },
        ],
        extra: { responseMimeType: 'application/json' },
      });
      const result = finalizeEvaluateHomework(extractJson(outputText(payload)), body);
      return Response.json({
        ...result,
        costUsd: payload.__kelyraUsd ?? null,
        model: payload.__kelyraModel ?? null,
        pass,
      });
    } catch (err) {
      return errorResponse(err, 'Homework read failed');
    }
  }),
);
