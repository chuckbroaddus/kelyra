# Kelyra Storage egress (Free plan, Aug 2026)

Status: investigation. Do not upgrade yet. Do not git-commit decks.

## What the dashboard said
Org Free, 1 project, cycle 13 Aug–13 Sep 2026. Grace until **17 Sep 2026**, then 402s.

| Meter | Used / included |
|---|---|
| Egress | 8.62 / 5 GB (172%) — this is the overage |
| Cached egress | 2.56 / 5 GB |
| Database | 0.03 / 0.5 GB |
| Storage size | 0.037 / 1 GB (dashboard) |
| Users / functions / realtime | tiny (3 users, 49 functions, 16 messages) |

Storage Egress is ~97% of the 8.62 GB. Not Postgres. Not Edge counts.

## What is actually in Storage (live, 2026-08-24)
`storage.objects` metadata size (may be larger than dashboard “Storage Size”):

| Bucket | Objects | ~MB |
|---|---|---|
| photos | 132 | 223 |
| audio | 48 | 8 |
| files | 2 | 0.3 |
| lessons | 0 | (not uploaded) |

Largest photos are **~2.8–3.3 MB JPEGs** (phone stills). Owner prefix `ecce41fe-…` (Chuck’s teacher id). Capture + message photos.

## Why 40 MB stored can still ship 8 GB
Avatars (`signedProfileUrl*`) sign **thumbs only** — never the original still. Missing thumb → initials, not a 3 MB JPEG. Grade-book status glyphs are bundled PNGs (`statusAssigned` / `Started` / `Completed`), zero Storage. Lists of homework stills may still fall back to the original if no `_thumb` object exists.

1. `normalizePhoto` compresses JPEG quality 0.8 but **does not resize**. A 12MP still stays ~3 MB.
2. Signed URL TTL 3600s. Memory cache in `photos.ts` is 50 min and dies on reload. A new token is a new URL, so the CDN treats it as a miss (matches cached 2.56 vs uncached 8.62).
3. `hydrateCaptures` signs every page of every inbox row at full size on each list load.
4. Full viewer and list thumb use the same object.

Rough: one 3 MB capture shown 20 times without HTTP cache ≈ 60 MB. A week of inbox + roster photos on a few devices clears 5 GB.

LAN lesson pages (`:8772`) do **not** count. `lessons` bucket is empty.

## What not to do first
- Do not move the school database off Supabase.
- Do not public-bucket the photos (FERPA / BJU / student faces).
- Do not pay Pro only to raise the egress cap until thumbs exist. Pro is the fallback if real classroom traffic still exceeds 5 GB after thumbs.
- Cloudflare R2 / Images is cheaper egress but a second origin + auth story. Later, not this slice.

## Build slice (S1)
See grok-build-queue.md S1.
