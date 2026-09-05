import { createClient } from 'npm:@supabase/supabase-js@2';

import { callMetered, extractJson, outputText, requireXaiKey } from '../_shared/ai.ts';
import { isAllowedAskImageUrl } from '../_shared/askImageUrl.ts';
import { imageDetailFor } from '../_shared/aiPolicy.ts';

const EXPLAIN_PROMPT = `You write a TEACHER Explain draft for one student capture.
Return JSON only, schema_version 1: {"schema_version":1,"source":"keyed|freeform","steps":["step"],"reteach":"note"}
Hard rules: pedagogy DRAFT only never a grade; prefer key+extract when keyed; no invented totals; first names only; 3-8 steps.`;


type ExplainDraft = {
  schema_version: 1;
  capture_id: string;
  source: "keyed" | "freeform";
  steps: string[];
  reteach: string | null;
};

function normalizeExplainDraft(parsed: Record<string, unknown>, captureId: string, keyed: boolean): ExplainDraft {
  const stepsRaw = Array.isArray(parsed?.steps) ? parsed.steps : [];
  const steps = stepsRaw.map((s) => String(s ?? "").trim()).filter(Boolean).slice(0, 12);
  const reteach =
    typeof parsed?.reteach === "string" && parsed.reteach.trim() ? parsed.reteach.trim() : null;
  return {
    schema_version: 1,
    capture_id: captureId,
    source: parsed?.source === "keyed" || keyed ? "keyed" : "freeform",
    steps: steps.length ? steps : ["Review the work with the student and note the first missed skill."],
    reteach,
  };
}

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

    const body = await req.json();
    const captureId = String(body.captureId ?? "").trim();
    const classId = String(body.classId ?? "").trim();
    let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!captureId) return json({ error: "captureId required" }, 400);
    if (!classId) return json({ error: "classId required" }, 400);

        // Authz BEFORE media / vendor. Active seat wall (class_teachers for teacher; parent_of for parent):
    // teacher → class_teachers; parent → parent_of(student) via gauth_load_explain_capture.
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, parent_id")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!profile?.role) return json({ error: "Sign in to Kelyra first." }, 401);
    if (profile.role !== "teacher" && profile.role !== "parent") {
      return json({ error: "Explain is not available for this seat." }, 403);
    }

    const { data: loaded, error: loadError } = await supabase.rpc("gauth_load_explain_capture", {
      p_capture_id: captureId,
    });
    if (loadError) {
      const msg = loadError.message || "Explain not allowed.";
      const status = /not found/i.test(msg) ? 404 : 403;
      return json({ error: msg }, status);
    }
    const capture = loaded as {
      id: string;
      class_id: string;
      student_id: string | null;
      assignment_id: string | null;
      photo_asset_id: string | null;
      photo_storage_path: string | null;
      key_items: unknown;
      extract: unknown;
      seat: string;
    };
    if (!capture?.id) return json({ error: "Capture not found." }, 404);
    if (capture.class_id !== classId) {
      return json({ error: "Capture does not belong to that class." }, 403);
    }
    // Dual-hat: active seat only — parent cannot use teacher extract path for unrelated classes.
    if (profile.role === "teacher" && capture.seat !== "teacher") {
      return json({ error: "You can only explain a capture for a class you teach." }, 403);
    }
    if (profile.role === "parent" && capture.seat !== "parent") {
      return json({ error: "You can only explain work for a linked child." }, 403);
    }

    const keyItems: unknown = capture.key_items ?? null;
    const extract: unknown = capture.extract ?? null;
    const keyed = Boolean(keyItems) || Boolean(extract);

    if (imageUrl && !isAllowedAskImageUrl(imageUrl)) {
      return json({ error: "Image URL is not allowed." }, 400);
    }
    if (!imageUrl && capture.photo_storage_path) {
      const { data: signed } = await supabase.storage.from("photos").createSignedUrl(capture.photo_storage_path, 60);
      imageUrl = signed?.signedUrl ?? "";
      if (imageUrl && !isAllowedAskImageUrl(imageUrl)) imageUrl = "";
    }

    const apiKey = requireXaiKey();
    const contextBits = [
      "capture_id=" + captureId,
      capture.student_id ? "student bound" : "student unassigned",
      keyed ? "keyed path" : "freeform path",
      keyItems ? "key_items=" + JSON.stringify(keyItems).slice(0, 4000) : null,
      extract ? "extract_marks=" + JSON.stringify(extract).slice(0, 4000) : null,
    ].filter(Boolean).join("\n");

    const content: Array<Record<string, unknown>> = [
      { type: "input_text", text: EXPLAIN_PROMPT + "\n\nContext:\n" + contextBits },
    ];
    if (imageUrl) {
      content.unshift({
        type: "input_image",
        image_url: imageUrl,
        detail: imageDetailFor("cheap"),
      });
    }

    const payload = await callMetered(supabase, apiKey, {
      job: "ask",
      functionName: "explain-capture",
      payload: [{ role: "user", content }],
    });
    const parsed = extractJson(outputText(payload)) as Record<string, unknown>;
    const draft = normalizeExplainDraft(parsed, captureId, keyed);

    if (profile.role === "teacher") {
      const { data: parked, error: parkError } = await supabase.rpc("park_explain_draft", {
        p_capture_id: captureId,
        p_draft: draft,
      });
      if (parkError) return json({ error: parkError.message }, 400);
      return json({
        ok: true,
        explain_draft: draft,
        explain_status: "draft",
        parked: true,
        capture: { id: (parked as { id?: string } | null)?.id ?? captureId, explain_status: "draft" },
      });
    }
    // Parent co-teacher: ephemeral help — do not park teacher draft columns.
    return json({
      ok: true,
      explain_draft: draft,
      explain_status: "ephemeral",
      parked: false,
      ephemeral: true,
      capture: { id: captureId },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Explain failed";
    const status = message.includes("XAI_API_KEY") || message.includes("GEMINI_API_KEY") ? 501 : 400;
    return json({ error: message }, status);
  }
});
