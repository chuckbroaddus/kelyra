import { ERROR_CODES, ERROR_COPY, type IngestErrorCode } from './config.ts';

export class RasterizeError extends Error {
  code: IngestErrorCode;
  constructor(code: IngestErrorCode, message?: string) {
    super(message ?? ERROR_COPY[code]);
    this.code = code;
    this.name = 'RasterizeError';
  }
}

export function isEncryptedPdfMessage(stderr: string, stdout: string): boolean {
  const text = `${stderr}\n${stdout}`.toLowerCase();
  if (/encrypted:\s*yes/.test(text)) return true;
  if (/incorrect password/.test(text)) return true;
  if (/password.?required/.test(text)) return true;
  if (/document is encrypted/.test(text)) return true;
  if (/encrypted document/.test(text)) return true;
  return false;
}

export { ERROR_CODES, ERROR_COPY };
