import { outputText, requireXaiKey, xaiResponses } from '../_shared/ai.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  try {
    const body = await req.json();
    const apiKey = requireXaiKey();
    const role = body.role === 'student' || body.role === 'parent' ? body.role : 'teacher';
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const last = messages
      .map((item: { from?: string; text?: string }) => `${item?.from === 'assistant' ? 'Ask' : 'User'}: ${String(item?.text ?? '')}`)
      .join('\n');
    const guard =
      role === 'parent'
        ? 'Parent view: approved focus, assigned/done, published sentence only. No scores, photos, drafts, other children, or Grok.'
        : role === 'student'
          ? 'Student view: their practice and approved focus only. No other students, drafts, scores, or Grok.'
          : 'Teacher view. Never Approve. Never insert a student.';
    const payload = await xaiResponses(apiKey, 'grok-4.6', [
      {
        role: 'user',
        content: `You are Ask, a filing assistant for Kelyra. ${guard}\n\n${last}`,
      },
    ]);
    const text = outputText(payload).trim();
    return Response.json({ text: text || "I can’t tell from what’s saved. Open Inbox or the student’s page." });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Ask failed' }, { status: 400 });
  }
});
