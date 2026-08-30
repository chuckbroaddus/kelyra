import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENV_COPY = path.join(HERE, "_ephem.env");
const OUT = path.join(HERE, "_gemini-tts-s12-captions");
const DEST_DIR = path.join(
  process.env.HOME,
  "projects/kelyra-author/scratch/fom-ch01-s12-test/audio/captions",
);
const TEACH_DIR = path.join(
  process.env.HOME,
  "projects/kelyra-author/scratch/fom-ch01-s12-test/audio",
);
const FN = "/functions/v1/gemini-tts";
const TEACH_SIZES = { s12t: 60524, s12c: 42572 };
const OLD_CAPTION_SIZES = { s12t: 231340, s12c: 215666 };

const CLIPS = [
  {
    id: "s12t",
    voice: "Kore",
    text: "An old leather book and a small wooden slate rest on a worn desk beside a glowing lantern. Behind them, shelves of glass bottles fade into the dark.",
  },
  {
    id: "s12c",
    voice: "Kore",
    text: "An open journal, a quill, and an inkwell sit on a desk in candlelight. Through the window, a full moon shines on a quiet sea.",
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

function statSize(p) {
  try {
    return fs.statSync(p).size;
  } catch {
    return null;
  }
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
  if (status !== 200 || !data) {
    results.push({ ...meta, hint: status === 503 ? "GEMINI_API_KEY missing on Edge" : "no data field" });
    continue;
  }
  const pcmPath = path.join(OUT, `${clip.id}.pcm`);
  const mp3Tmp = path.join(OUT, `${clip.id}.mp3`);
  const buf = Buffer.from(data, "base64");
  fs.writeFileSync(pcmPath, buf);
  meta.decoded_bytes = buf.length;
  const ff = spawnSync(
    "ffmpeg",
    ["-y", "-f", "s16le", "-ar", String(meta.rate), "-ac", "1", "-i", pcmPath, mp3Tmp],
    { encoding: "utf8" },
  );
  meta.ffmpeg_status = ff.status;
  meta.ffmpeg_ok = ff.status === 0 && fs.existsSync(mp3Tmp);
  meta.mp3_bytes = meta.ffmpeg_ok ? fs.statSync(mp3Tmp).size : null;
  fs.writeFileSync(path.join(OUT, `${clip.id}.meta.json`), JSON.stringify(meta, null, 2));
  results.push(meta);
}

const dest = {};
for (const clip of CLIPS) {
  const src = path.join(OUT, `${clip.id}.mp3`);
  const destMp3 = path.join(DEST_DIR, `${clip.id}.mp3`);
  const backup = path.join(DEST_DIR, `${clip.id}.pre-gemini-voice`);
  if (!fs.existsSync(src)) {
    dest[clip.id] = { error: "mp3 missing" };
    continue;
  }
  if (fs.existsSync(destMp3) && !fs.existsSync(backup)) {
    fs.copyFileSync(destMp3, backup);
  }
  fs.copyFileSync(src, destMp3);
  dest[clip.id] = {
    dest: destMp3,
    size: fs.statSync(destMp3).size,
    backup: fs.existsSync(backup) ? fs.statSync(backup).size : null,
    old: OLD_CAPTION_SIZES[clip.id],
    differs_from_old: fs.statSync(destMp3).size !== OLD_CAPTION_SIZES[clip.id],
  };
}

const teachCheck = {
  s12t: statSize(path.join(TEACH_DIR, "s12t.mp3")),
  s12c: statSize(path.join(TEACH_DIR, "s12c.mp3")),
};
const teachCheckUntouched =
  teachCheck.s12t === TEACH_SIZES.s12t && teachCheck.s12c === TEACH_SIZES.s12c;

console.log(
  JSON.stringify(
    {
      step: "tts_captions",
      results: results.map((r) => ({
        id: r.id,
        status: r.status,
        model: r.model,
        voice: r.voice,
        mime: r.mime,
        data_chars: r.data_chars,
        decoded_bytes: r.decoded_bytes,
        ffmpeg_ok: r.ffmpeg_ok,
        mp3_bytes: r.mp3_bytes,
        error: r.error,
        hint: r.hint || null,
      })),
      dest,
      teachCheck,
      teachCheckUntouched,
    },
    null,
    2,
  ),
);

const failed = results.some((r) => r.status !== 200 || !r.ffmpeg_ok) || !teachCheckUntouched;
if (failed) process.exit(1);
