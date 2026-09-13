# ingest-rasterize (BATCH-v1 I2)

Dedicated worker: claim `received` → `rasterizing`, stream PDF pages via Poppler, write JPEG (long-edge 1600–2048) + thumb (~400), blank flag, `pages_done` progress, packet guess → `split_review`.

**Not** an Edge Function. Do not add `supabase/functions/rasterize-*`.

## Secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No model API keys. Never upload the class PDF to a model (PM BATCH-12/19, ADR-016).

## Host

Cloud Run or Fly. Disk + multi-minute + >512 MB RAM. Poll every 2 s. `GET /healthz`.

## Local

```bash
cd workers/ingest-rasterize
npm install
npm test
# needs pdfinfo + pdftoppm on PATH (poppler-utils)
SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm start
```
