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

    // Authz BEFORE media / vendor (GAUTH-S1-05). class_teachers only.
    const { data: taught } = await supabase
      .from("class_teachers")
      .select("class_id")
      .eq("class_id", classId)
      .eq("teacher_id", auth.user.id)
      .maybeSingle();
    if (!taught) {
      return json({ error: "You can only explain a capture for a class you teach." }, 403);
    }

    const { data: capture, error: capError } = await supabase
      .from("captures")
      .select("id, class_id, student_id, model_draft, draft_score, photo_asset_id, assignment_id")
      .eq("id", captureId)
      .maybeSingle();
    if (capError || !capture) return json({ error: "Capture not found." }, 404);
    if (capture.class_id !== classId) {
      return json({ error: "Capture does not belong to that class." }, 403);
    }

    let keyItems: unknown = null;
    let extract: unknown = null;
    if (capture.assignment_id) {
      const { data: assignment } = await supabase
        .from("assignments")
        .select("id, key_items, key_kind")
        .eq("id", capture.assignment_id)
        .maybeSingle();
      keyItems = assignment?.key_items ?? null;
    }
    const modelDraft = (capture.model_draft ?? {}) as Record<string, unknown>;
    extract = modelDraft.extract ?? modelDraft.items ?? modelDraft.marks ?? null;
    const keyed = Boolean(keyItems) || Boolean(extract);

    if (imageUrl && !isAllowedAskImageUrl(imageUrl)) {
      return json({ error: "Image URL is not allowed." }, 400);
    }
    if (!imageUrl && capture.photo_asset_id) {
      const { data: asset } = await supabase
        .from("assets")
        .select("storage_path")
        .eq("id", capture.photo_asset_id)
        .maybeSingle();
      if (asset?.storage_path) {
        const { data: signed } = await supabase.storage.from("photos").createSignedUrl(asset.storage_path, 60);
        imageUrl = signed?.signedUrl ?? "";
        if (imageUrl && !isAllowedAskImageUrl(imageUrl)) imageUrl = "";
      }
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

    const { data: parked, error: parkError } = await supabase.rpc("park_explain_draft", {
      p_capture_id: captureId,
      p_draft: draft,
    });
    if (parkError) return json({ error: parkError.message }, 400);

    return json({
      ok: true,
      explain_draft: draft,
      explain_status: "draft",
      capture: { id: (parked as { id?: string } | null)?.id ?? captureId, explain_status: "draft" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Explain failed";
    const status = message.includes("XAI_API_KEY") || message.includes("GEMINI_API_KEY") ? 501 : 400;
    return json({ error: message }, status);
  }
});
