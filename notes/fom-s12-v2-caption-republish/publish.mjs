import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_COPY = path.join(HERE, "..", "_ephem.env");
const ZIP = path.join(HERE, "pack.zip");
const SCHOOL = "debffda1-36f4-4a85-b726-bde83f9f46aa";
const FN = "/functions/v1/publish-lesson-pack";

function parseEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1);
    if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function keysOf(x) {
  if (x && typeof x === "object" && !Array.isArray(x)) return Object.keys(x);
  if (Array.isArray(x)) return ["<array>", String(x.length)];
  return [];
}

function safeBody(text) {
  const s = String(text || "").slice(0, 2500);
  return s
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt]")
    .replace(/sb_[a-z]+_[A-Za-z0-9]+/g, "[key]")
    .replace(/"access_token"\s*:\s*"[^"]+"/g, "\"access_token\":\"[redacted]\"")
    .replace(/"refresh_token"\s*:\s*"[^"]+"/g, "\"refresh_token\":\"[redacted]\"")
    .replace(/"password"\s*:\s*"[^"]+"/g, "\"password\":\"[redacted]\"");
}

async function req(method, url, headers, body) {
  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

let userId = null;
let env = null;

try {
  if (!fs.existsSync(ENV_COPY)) throw new Error("ephemeral env missing");
  if (!fs.existsSync(ZIP)) throw new Error("pack zip missing");
  env = parseEnv(ENV_COPY);
  const url = (env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    throw new Error("missing required env keys (names only: url/anon/service)");
  }

  const zipBytes = fs.statSync(ZIP).size;
  if (zipBytes >= 12304812) throw new Error("zip exceeds 12MB quota");
  console.log(JSON.stringify({ zip_bytes: zipBytes, zip_under_12mb: true }));

  const rand = crypto.randomBytes(8).toString("hex");
  const email = `cos-publish-tmp+${rand}@kelyra.invalid`;
  const password = crypto.randomBytes(24).toString("base64url");
  const username = `cospub${rand}`;
  const displayName = "tmp-publish";

  const adminH = {
    Authorization: `Bearer ${service}`,
    apikey: service,
    "Content-Type": "application/json",
  };

  const created = await req(
    "POST",
    `${url}/auth/v1/admin/users`,
    adminH,
    JSON.stringify({ email, password, email_confirm: true }),
  );
  userId = created.json?.id || created.json?.user?.id || null;
  console.log(
    JSON.stringify({
      step: "admin_create_user",
      status: created.status,
      has_id: Boolean(userId),
      body_keys: keysOf(created.json),
    }),
  );
  if (!userId || created.status >= 300) {
    throw new Error(`admin create user failed status=${created.status} body=${safeBody(created.text)}`);
  }

  const profile = await req(
    "POST",
    `${url}/rest/v1/profiles`,
    { ...adminH, Prefer: "return=minimal" },
    JSON.stringify({
      id: userId,
      school_id: SCHOOL,
      role: "teacher",
      email,
      display_name: displayName,
      username,
    }),
  );
  console.log(JSON.stringify({ step: "insert_profiles", status: profile.status, body_keys: keysOf(profile.json) }));
  if (profile.status >= 300) {
    throw new Error(`profiles insert failed status=${profile.status} body=${safeBody(profile.text)}`);
  }

  const teacher = await req(
    "POST",
    `${url}/rest/v1/teachers`,
    { ...adminH, Prefer: "return=minimal" },
    JSON.stringify({ id: userId, email, display_name: displayName }),
  );
  console.log(JSON.stringify({ step: "insert_teachers", status: teacher.status, body_keys: keysOf(teacher.json) }));
  if (teacher.status >= 300) {
    throw new Error(`teachers insert failed status=${teacher.status} body=${safeBody(teacher.text)}`);
  }

  const grant = await req(
    "POST",
    `${url}/auth/v1/token?grant_type=password`,
    { apikey: anon, "Content-Type": "application/json" },
    JSON.stringify({ email, password }),
  );
  const jwt = grant.json?.access_token;
  console.log(
    JSON.stringify({
      step: "password_grant",
      status: grant.status,
      has_access_token: Boolean(jwt),
      body_keys: keysOf(grant.json),
    }),
  );
  if (!jwt || grant.status >= 300) {
    throw new Error(`password grant failed status=${grant.status} keys=${keysOf(grant.json).join(",")}`);
  }

  const form = new FormData();
  form.set("deck_id", "fom-ch01-s12-test");
  form.set("version", "v2");
  form.set("storage_deck_id", "fom-ch01-s12-author-test");
  form.set("title", "FoM \u00b7 1.2 Addition and Subtraction");
  form.set("beat_start", "s12t");
  form.set("beat_end", "s12c");
  form.set("kind", "lesson");
  const zipBuf = fs.readFileSync(ZIP);
  form.set("zip", new Blob([zipBuf], { type: "application/zip" }), "pack.zip");

  const pubRes = await fetch(`${url}${FN}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, apikey: anon },
    body: form,
  });
  const pubText = await pubRes.text();
  let pubJson = null;
  try {
    pubJson = JSON.parse(pubText);
  } catch {
    pubJson = null;
  }
  console.log(
    JSON.stringify({
      step: "publish",
      status: pubRes.status,
      body_keys: keysOf(pubJson),
      body_safe: pubJson
        ? {
            ok: pubJson.ok,
            deck_id: pubJson.deck_id,
            version: pubJson.version,
            storage_deck_id: pubJson.storage_deck_id,
            beat_start: pubJson.beat_start,
            beat_end: pubJson.beat_end,
            title: pubJson.title,
            published: pubJson.published,
            bytes: pubJson.bytes,
            error: pubJson.error,
            detail: pubJson.detail,
          }
        : safeBody(pubText),
    }),
  );
  if (pubRes.status >= 300 || !pubJson?.ok || pubJson.published !== false) {
    throw new Error(`publish failed status=${pubRes.status} published=${pubJson && pubJson.published}`);
  }
} catch (err) {
  console.error(JSON.stringify({ step: "error", message: String(err && err.message ? err.message : err) }));
  process.exitCode = 1;
} finally {
  try {
    if (userId && env) {
      const url = (env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
      const service = env.SUPABASE_SERVICE_ROLE_KEY;
      const adminH = {
        Authorization: `Bearer ${service}`,
        apikey: service,
        "Content-Type": "application/json",
      };
      const delT = await req("DELETE", `${url}/rest/v1/teachers?id=eq.${userId}`, { ...adminH, Prefer: "return=minimal" });
      const delP = await req("DELETE", `${url}/rest/v1/profiles?id=eq.${userId}`, { ...adminH, Prefer: "return=minimal" });
      const delU = await req("DELETE", `${url}/auth/v1/admin/users/${userId}`, adminH);
      console.log(
        JSON.stringify({
          step: "cleanup_user",
          teachers: delT.status,
          profiles: delP.status,
          auth: delU.status,
        }),
      );
    } else {
      console.log(JSON.stringify({ step: "cleanup_user", skipped: true }));
    }
  } catch (cleanErr) {
    console.error(JSON.stringify({ step: "cleanup_user_error", message: String(cleanErr && cleanErr.message ? cleanErr.message : cleanErr) }));
  }
  try {
    if (fs.existsSync(ENV_COPY)) fs.unlinkSync(ENV_COPY);
    console.log(JSON.stringify({ step: "cleanup_env", deleted: true }));
  } catch (envErr) {
    console.error(JSON.stringify({ step: "cleanup_env_error", message: String(envErr && envErr.message ? envErr.message : envErr) }));
  }
}
