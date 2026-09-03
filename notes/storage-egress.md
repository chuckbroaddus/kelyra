# Kelyra Storage egress (Free plan, Aug 2026)

Status: S1 code in tree (thumbs + signed-URL disk cache + upload resize). Do not upgrade yet. Do not git-commit decks.

**CoS apply:** migration `supabase/migrations/20260824000006_photo_thumbs.sql`, then `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run thumbs`. Lists no longer fall back to multi-MB originals when a thumb is missing.

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

## Why 40 MB stored used to ship 8 GB (pre-S1)
Root causes before the S1 client fixes (still true for objects that never got a `_thumb` backfill):

1. Upload shipped full phone stills (~2.8–3.3 MB). S1 upload now resizes long edge (`PHOTO_MAX_EDGE` ~1600) and writes `*_thumb` beside the original.
2. Signed URL TTL 3600s with no durable cache → new token each session → CDN miss (cached egress 2.56 vs uncached 8.62). S1 persists signed URLs (AsyncStorage keyed by bucket:path) until near expiry; `cacheKeyForUri` strips the token for expo-image disk cache.
3. List hydration signed full-size originals for every inbox/roster row. S1 list/avatar/message/WorkRow paths sign **thumbs only** with `fallbackOriginal: false` (missing thumb → blank/initials, not multi-MB original). ImageViewer / Capture review / analyze-homework / Ask photo still use originals.
4. Existing Storage objects stay large until CoS applies `20260824000006_photo_thumbs.sql` and runs `npm run thumbs`.

Rough historical: one 3 MB capture shown 20 times without HTTP cache ≈ 60 MB. A week of inbox + roster on a few devices cleared 5 GB.

LAN lesson pages (`:8772`) do **not** count. `lessons` bucket is empty.

## What not to do first
- Do not move the school database off Supabase.
- Do not public-bucket the photos (FERPA / BJU / student faces).
- Do not pay Pro only to raise the egress cap until thumbs exist. Pro is the fallback if real classroom traffic still exceeds 5 GB after thumbs.
- Cloudflare R2 / Images is cheaper egress but a second origin + auth story. Later, not this slice.

## Build slice (S1)
See grok-build-queue.md S1.
