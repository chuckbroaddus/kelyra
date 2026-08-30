/** Shared-domain lesson-host GET text/html is rewritten to text/plain + nosniff. */
export function lessonDocumentBase(documentUrl: string): string {
  try {
    const parsed = new URL(documentUrl);
    const path = parsed.pathname.endsWith('/')
      ? parsed.pathname
      : parsed.pathname.replace(/[^/]+$/, '');
    parsed.pathname = path.endsWith('/') ? path : `${path}/`;
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return documentUrl.replace(/[^/]+$/, '');
  }
}

export function injectLessonBase(html: string, documentUrl: string): string {
  if (/<base\s/i.test(html)) return html;
  const tag = `<base href="${lessonDocumentBase(documentUrl)}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);
  return `${tag}\n${html}`;
}

export function looksLikeLessonHtml(text: string): boolean {
  return /^\s*</.test(text) || /<!DOCTYPE\s+html/i.test(text);
}
