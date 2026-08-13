// Placeholder Edge Function.
// 1. Match spoken name against the class roster (never insert a student).
// 2. If homework is attached, draft gaps + optional score.

Deno.serve(() => {
  return Response.json(
    { error: 'not_implemented', function: 'match-and-analyze' },
    { status: 501 },
  );
});
