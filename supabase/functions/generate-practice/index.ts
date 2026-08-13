// Placeholder Edge Function. Generates 3–8 practice items for one skill.

Deno.serve(() => {
  return Response.json(
    { error: 'not_implemented', function: 'generate-practice' },
    { status: 501 },
  );
});
