import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_COPY = path.join(HERE, "_ephem.env");
const TARGET = "83e88c23-2854-40f7-825f-2c3481bfa6fa";

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

async function req(method, url, headers) {
  const res = await fetch(url, { method, headers });
  const text = await res.text();
  return { status: res.status, len: text.length };
}

try {
  if (!fs.existsSync(ENV_COPY)) throw new Error("ephemeral env missing");
  const env = parseEnv(ENV_COPY);
  const url = (env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("missing url or service");
  const adminH = {
    Authorization: `Bearer ${service}`,
    apikey: service,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
  const delT = await req("DELETE", `${url}/rest/v1/teachers?id=eq.${TARGET}`, adminH);
  const delP = await req("DELETE", `${url}/rest/v1/profiles?id=eq.${TARGET}`, adminH);
  const delU = await req("DELETE", `${url}/auth/v1/admin/users/${TARGET}`, {
    Authorization: `Bearer ${service}`,
    apikey: service,
  });
  console.log(JSON.stringify({ step: "cleanup_prior_tmp", teachers: delT.status, profiles: delP.status, auth: delU.status }));
} catch (err) {
  console.error(JSON.stringify({ step: "cleanup_prior_tmp_error", message: String(err && err.message ? err.message : err) }));
  process.exitCode = 1;
} finally {
  try {
    if (fs.existsSync(ENV_COPY)) fs.unlinkSync(ENV_COPY);
    console.log(JSON.stringify({ step: "cleanup_env", deleted: true }));
  } catch (e) {
    console.error(JSON.stringify({ step: "cleanup_env_error", message: String(e && e.message ? e.message : e) }));
  }
}
