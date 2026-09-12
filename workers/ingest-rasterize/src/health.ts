export function healthz(): { status: 'ok'; service: string; version: string } {
  return { status: 'ok', service: 'ingest-rasterize', version: '0.1.0' };
}
