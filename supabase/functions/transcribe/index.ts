// Placeholder Edge Function. Receives uploaded audio, returns a transcript.
// Implementation will call Grok Voice STT via ../_shared/ai.ts

Deno.serve(() => {
  return Response.json(
    { error: 'not_implemented', function: 'transcribe' },
    { status: 501 },
  );
});
