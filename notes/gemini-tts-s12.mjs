import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_COPY = path.join(HERE, "_ephem.env");
const OUT = path.join(HERE, "_gemini-tts-s12");
const FN = "/functions/v1/gemini-tts";

const CLIPS = [
  {
    id: "s12t",
    voice: "Kore",
    text: "Addends make a sum. Minuend minus subtrahend is a difference. 32 minus 16.485 equals 15.515. Estimate, then line up decimals.",
  },
  {
    id: "s12c",
    voice: "Kore",
    text: "Solve each problem carefully. Start with 342 plus 219. Watch the decimal points.",
  },
];

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

function parseRate(mime) {
  const m = String(mime || "").match(/rate\s*=\s*(\d+)/i);
  return m ? Number(m[1]) : 24000;
}

fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(ENV_COPY)) {
  console.log(JSON.stringify({ step: "error", message: "ephemeral env missing" }));
  process.exit(1);
}
const env = parseEnv(ENV_COPY);
const url = (env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.log(JSON.stringify({ step: "error", message: "missing url or service key name-only" }));
  process.exit(1);
}

const results = [];
for (const clip of CLIPS) {
  const res = await fetch(`${url}${FN}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${service}`,
      apikey: service,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: clip.text, voice: clip.voice }),
  });
  const status = res.status;
  const raw = await res.text();
  let json = null;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  const mime = json && typeof json.mime === "string" ? json.mime : null;
  const model = json && typeof json.model === "string" ? json.model : null;
  const voice = json && typeof json.voice === "string" ? json.voice : clip.voice;
  const data = json && typeof json.data === "string" ? json.data : null;
  const err = json && json.error ? String(json.error) : null;
  const last = json && json.last ? String(json.last) : null;
  const meta = {
    id: clip.id,
    status,
    model,
    voice,
    mime,
    data_chars: data ? data.length : 0,
    error: err,
    last,
    body_keys: keysOf(json),
    rate: parseRate(mime),
  };
  fs.writeFileSync(path.join(OUT, `${clip.id}.meta.json`), JSON.stringify(meta, null, 2));
  if (status === 503) {
    results.push({ ...meta, hint: "GEMINI_API_KEY missing on Edge" });
    continue;
  }
  if (status === 401) {
    results.push({ ...meta, hint: "JWT rejected" });
    continue;
  }
  if (!data) {
    results.push({ ...meta, hint: "no data field" });
    continue;
  }
  const b64Path = path.join(OUT, `${clip.id}.b64`);
  const pcmPath = path.join(OUT, `${clip.id}.pcm`);
  fs.writeFileSync(b64Path, data);
  const buf = Buffer.from(data, "base64");
  fs.writeFileSync(pcmPath, buf);
  meta.decoded_bytes = buf.length;
  meta.b64_path = b64Path;
  meta.pcm_path = pcmPath;
  fs.writeFileSync(path.join(OUT, `${clip.id}.meta.json`), JSON.stringify(meta, null, 2));
  results.push(meta);
}

console.log(JSON.stringify({ step: "tts", results }, null, 2));
