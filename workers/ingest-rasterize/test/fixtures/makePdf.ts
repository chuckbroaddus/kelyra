/**
 * Minimal PDF writers for I2 fixtures (no model, no network).
 */
import { writeFile } from 'node:fs/promises';

/** Build an N-page PDF with simple content streams (letter size). */
export function buildMultiPagePdf(pageCount: number, opts?: { ink?: boolean }): Buffer {
  const objects: string[] = [];
  const offsets: number[] = [];
  const kids: string[] = [];

  // obj 1 Catalog, obj 2 Pages — filled later
  const pageObjs: { pageNum: number; contentNum: number }[] = [];

  let next = 3;
  for (let i = 0; i < pageCount; i += 1) {
    const contentNum = next++;
    const pageNum = next++;
    pageObjs.push({ pageNum, contentNum });
    kids.push(`${pageNum} 0 R`);
  }

  const header = '%PDF-1.4\n';
  let body = '';

  function addObj(num: number, raw: string) {
    offsets[num] = Buffer.byteLength(header + body, 'utf8');
    body += `${num} 0 obj\n${raw}\nendobj\n`;
  }

  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  addObj(
    2,
    `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pageCount} >>`,
  );

  for (let i = 0; i < pageCount; i += 1) {
    const { pageNum, contentNum } = pageObjs[i]!;
    // ink: draw a dark rectangle; blank: nearly empty
    // Substantial ink so blank-detect does not treat homework-like pages as blank backs.
    const stream = opts?.ink
      ? `q 0.15 0.15 0.15 rg 36 36 540 720 re f 1 1 1 rg 72 700 200 40 re f Q\nBT /F1 24 Tf 72 710 Td (Page ${i + 1}) Tj ET`
      : `BT /F1 1 Tf 0 0 Td ( ) Tj ET`;
    addObj(contentNum, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    addObj(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNum} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>`,
    );
  }

  const xrefStart = Buffer.byteLength(header + body, 'utf8');
  const maxObj = next - 1;
  let xref = `xref\n0 ${maxObj + 1}\n`;
  xref += `0000000000 65535 f \n`;
  for (let i = 1; i <= maxObj; i += 1) {
    xref += `${String(offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer, 'utf8');
}

/** Owner-password encrypted PDF stub — pdfinfo should report encrypted. Uses qdf-like encrypt via gs if available; else a known encrypted minimal. */
export async function writeEncryptedPdfStub(dest: string): Promise<void> {
  // Minimal PDF declaring Encrypt dict — poppler treats as encrypted/password.
  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>
endobj
4 0 obj
<< /Filter /Standard /V 1 /R 2 /U (xxxxxxxxxxxxxxxx) /O (xxxxxxxxxxxxxxxx) /P -4 >>
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000190 00000 n 
trailer
<< /Size 5 /Root 1 0 R /Encrypt 4 0 R >>
startxref
280
%%EOF
`;
  await writeFile(dest, pdf);
}

export async function writeMultiPagePdf(dest: string, pageCount: number, ink = true): Promise<void> {
  await writeFile(dest, buildMultiPagePdf(pageCount, { ink }));
}
