import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, outputText, requireXaiKey } from '../_shared/ai.ts';

const PRACTICE_HELP_MARKERS = { help_mode: true, attempt_gate: true, no_bulk_key: true, approved_score_written: false };

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  try {
    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) {
      return json({ error: "Sign in to Kelyra first." }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user?.id) {
      return json({ error: "Sign in to Kelyra first." }, 401);
    }

    // GAUTH G4 Practice Help — student JWT only; help_mode re-read fail-closed.
    const body = await req.json();
    const assignmentId = String(body.assignmentId ?? "").trim();
    const studentId = String(body.studentId ?? "").trim();
    const itemId = String(body.itemId ?? "").trim();
    const actionRaw = String(body.action ?? "hint").trim();
    const attemptText = typeof body.attemptText === "string" ? body.attemptText : "";
    if (!assignmentId || !studentId || !itemId) return json({ error: "assignmentId, studentId, and itemId are required." }, 400);
    const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", auth.user.id).maybeSingle();
    if (!profile || profile.role !== "student") return json({ error: "Practice Help is only for the signed-in student." }, 403);
    const { data: me } = await supabase.rpc("student_me");
    const meRow = Array.isArray(me) ? me[0] : me;
    const myStudentId = typeof meRow?.student_id === "string" ? meRow.student_id : "";
    if (!myStudentId || myStudentId !== studentId) return json({ error: "Practice Help is only for your own roster row." }, 403);
    const { data: assignment, error: asgError } = await supabase.from("assignments").select("id, class_id, kind, help_mode, practice_set_id").eq("id", assignmentId).maybeSingle();
    if (asgError || !assignment) return json({ error: "Assignment not found." }, 404);
    if (assignment.kind !== "practice") return json({ error: "Practice Help is only for practice sets — not graded captures." }, 403);
    const helpMode = String(assignment.help_mode ?? "off");
    if (helpMode === "off") return json({ error: "Help is off for this assignment.", refused: true, help_mode: "off" }, 403);
    const { data: enrolled } = await supabase.from("enrollments").select("student_id").eq("class_id", assignment.class_id).eq("student_id", studentId).maybeSingle();
    if (!enrolled) return json({ error: "Not enrolled in this class." }, 403);
    const { data: submission } = await supabase.from("submissions").select("id, answers, status").eq("assignment_id", assignmentId).eq("student_id", studentId).maybeSingle();
    if (!submission) return json({ error: "No practice submission cell for this student." }, 404);
    const answers = (submission.answers ?? {}) as Record<string, unknown>;
    const attempted = Boolean(attemptText.trim()) || Boolean(String(answers[itemId] ?? "").trim());
    const needsAttempt = actionRaw === "next_step" || actionRaw === "isomorphic" || actionRaw === "full_item" || actionRaw === "check_work";
    if (needsAttempt && !attempted) return json({ error: "Try the item first. Full help unlocks after an attempt.", refused: true, attempt_gate: true, help_mode: helpMode }, 403);
    if (helpMode === "hints" && actionRaw !== "hint") return json({ error: "Only hints are allowed.", refused: true, help_mode: helpMode }, 403);
    if (!assignment.practice_set_id) return json({ error: "Practice set is missing." }, 400);
    const { data: practiceSet } = await supabase.from("practice_sets").select("id, items").eq("id", assignment.practice_set_id).maybeSingle();
    const items = Array.isArray(practiceSet?.items) ? practiceSet.items as Array<Record<string, unknown>> : [];
    const item = items.find((row) => String(row?.id ?? "") === itemId);
    if (!item) return json({ error: "Practice item not found." }, 404);
    const prompt = String(item.prompt ?? item.question ?? "Practice item");
    const key = String(item.answerKey ?? item.answer_key ?? item.worked_example ?? item.workedExample ?? "");
    // never return bulk key — only this item coaching text
    const studentAttempt = attemptText.trim() || String(answers[itemId] ?? "");
    const ladder =
      actionRaw === "hint" ? "Give ONE conceptual hint only. No final answer." :
      actionRaw === "next_step" ? "Give the NEXT step only. No final answer." :
      actionRaw === "isomorphic" ? "Give one isomorphic example. Do not fully solve the original." :
      actionRaw === "full_item" ? "Show a worked solution for THIS item only." :
      actionRaw === "check_work" ? "Compare the attempt to this item key/worked example only." :
      "Give a conceptual hint only.";
    if (helpMode === "steps_after_try" && (actionRaw === "isomorphic" || actionRaw === "check_work")) {
      return json({ error: "Action not allowed for this help_mode.", refused: true, help_mode: helpMode }, 403);
    }
    const apiKey = requireXaiKey();
    const content = [
      { type: "input_text", text: "You are Kelyra Practice Help for ONE practice item. Never write grades or approved_score. Never reveal other items. " + ladder + "\n\nitem_prompt=" + prompt.slice(0, 2000) + "\nthis_item_key_or_worked_example=" + key.slice(0, 2000) + "\nstudent_attempt=" + studentAttempt.slice(0, 2000) },
    ];
    const payload = await callMetered(supabase, apiKey, {
      job: "ask",
      functionName: "practice-help",
      payload: [{ role: "user", content }],
    });
    const text = outputText(payload).trim() || "Try a smaller step on this item, then ask again.";
    // G5: count successful Help turns. Re-read help_mode inside RPC (fail-closed / revoke).
    // Soft-fail count so a missing migration cannot break G4 Help text.
    let helpUsed: unknown = undefined;
    try {
      const { data: counted } = await supabase.rpc("record_practice_help_use", {
        p_assignment_id: assignmentId,
        p_item_id: itemId,
        p_action: actionRaw,
      });
      helpUsed = counted ?? undefined;
    } catch {
      helpUsed = undefined;
    }
    // Integrity: never write approved_score from Help. No keystroke payload stored.
    return json({
      ok: true,
      help_mode: helpMode,
      action: actionRaw,
      item_id: itemId,
      text,
      approved_score_written: false,
      ...(helpUsed !== undefined ? { help_used: helpUsed } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Practice Help failed";
    const status = message.includes("XAI_API_KEY") || message.includes("GEMINI_API_KEY") ? 501 : 400;
    return json({ error: message }, status);
  }
});
