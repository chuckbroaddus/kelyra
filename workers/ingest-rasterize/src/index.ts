/**
 * BATCH-v1 I2 ingest-rasterize worker entry.
 * Poll ingest_batches; health on PORT. Not Edge.
 */
import http from 'node:http';
import { POLL_MS } from './config.ts';
import { claimNextBatch, createServiceClient } from './db.ts';
import { healthz } from './health.ts';
import { rasterizeBatch } from './rasterize.ts';

const port = Number(process.env.PORT ?? 8080);

async function main(): Promise<void> {
  const supabase = createServiceClient();
  let busy = false;

  const server = http.createServer((req, res) => {
    if (req.url === '/healthz' || req.url === '/health') {
      const body = JSON.stringify(healthz());
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end('not found');
  });

  server.listen(port, () => {
    console.log(`ingest-rasterize listening :${port} healthz + poll ${POLL_MS}ms`);
  });

  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      const batch = await claimNextBatch(supabase);
      if (batch) {
        console.log(`claimed batch ${batch.id} teacher=${batch.teacher_id}`);
        await rasterizeBatch(supabase, batch);
        console.log(`finished batch ${batch.id}`);
      }
    } catch (err) {
      console.error('poll error', err instanceof Error ? err.message : err);
    } finally {
      busy = false;
    }
  };

  await tick();
  setInterval(() => {
    void tick();
  }, POLL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
