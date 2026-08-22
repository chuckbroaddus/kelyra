function decode(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const named = html.match(
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, 'i'),
    );
    if (named?.[1]) return decode(named[1]);
    const flipped = html.match(
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
    );
    if (flipped?.[1]) return decode(flipped[1]);
  }
  return null;
}

function absUrl(from: string, maybe: string | null): string | null {
  if (!maybe) return null;
  try {
    return new URL(maybe, from).toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  try {
    const body = (await req.json()) as { url?: string };
    const raw = String(body.url ?? '').trim();
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Need an https link');
    }
    const target = parsed.toString();
    const res = await fetch(target, {
      redirect: 'follow',
      headers: { 'User-Agent': 'KelyraBot/1.0', Accept: 'text/html' },
    });
    if (!res.ok) throw new Error('Could not open that page');
    const html = (await res.text()).slice(0, 200_000);
    const title =
      attr(html, ['og:title', 'twitter:title']) ||
      decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? '') ||
      parsed.hostname;
    const description = attr(html, ['og:description', 'twitter:description', 'description']);
    const image = absUrl(target, attr(html, ['og:image', 'twitter:image']));
    return Response.json({
      url: target,
      title,
      description,
      image_url: image,
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not unfurl' }, { status: 400 });
  }
});
