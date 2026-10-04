/** Student page → which assignment's answer key it is (hash first, vision tiebreak). Ported from ai:dev. */
import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { matchKeyPrompt } from '../_shared/aiPrompts.ts';
import {
  finalizeKeyPick,
  hashOnlyKeyMatch,
  matchKeyCandidateText,
  planKeyMatch,
} from '../_shared/answerKeyMatch.ts';
import { isAllowedAskImageUrl } from '../_shared/askImageUrl.ts';
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
      const keys = Array.isArray(body.keys) ? body.keys.slice(0, 40) : [];
      if (!keys.length) return Response.json({ assignmentId: null, confidence: 0, scores: [] });

      const probe = await pageSignatureFromUrl(imageUrl);
      const plan = planKeyMatch(keys, probe);
      if ('result' in plan) return Response.json(plan.result);

      const withPhotos = plan.shortlist.filter(
        (row) => typeof row.imageUrl === 'string' && isAllowedAskImageUrl(row.imageUrl),
      );
      if (!withPhotos.length) return Response.json(hashOnlyKeyMatch(plan.best, plan.scores));

      const payload = await callMetered(supabase, requireXaiKey(), {
        job: 'match-key',
        functionName: 'match-key',
        payload: [
          {
            role: 'user',
            content: [
              { type: 'input_image', image_url: imageUrl, detail: 'low' },
              ...withPhotos.map((row) => ({ type: 'input_image', image_url: String(row.imageUrl), detail: 'low' })),
              {
                type: 'input_text',
                text: `${matchKeyPrompt}\n\nCandidate keys (in the same order as the images after the student page):\n${matchKeyCandidateText(withPhotos)}`,
              },
            ],
          },
        ],
        extra: { responseMimeType: 'application/json' },
      });
      return Response.json(
        finalizeKeyPick(
          extractJson(outputText(payload)),
          withPhotos.map((row) => row.id),
          plan.best,
          plan.scores,
        ),
      );
    } catch (err) {
      return errorResponse(err, 'Key match failed');
    }
  }),
);
