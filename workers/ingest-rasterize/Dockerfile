# BATCH-v1 I2 rasterize worker — Cloud Run / Fly (NOT supabase/functions/rasterize-*).
# Needs poppler-utils (pdfinfo/pdftoppm). DevOps may swap pdfium later.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Secrets at runtime: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Never XAI_API_KEY / model keys — ADR-016: class PDF never goes to a model.
CMD ["node", "--experimental-strip-types", "src/index.ts"]
