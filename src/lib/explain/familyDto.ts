import { FAMILY_OMIT_CAPTURE_KEYS, omitFamilyCaptureSecrets } from '@/lib/explain/api';

export { FAMILY_OMIT_CAPTURE_KEYS, omitFamilyCaptureSecrets };

/** Assert a family-facing payload never carries GAUTH teacher blobs. */
export function assertFamilyDtoOmitsExplain(payload: unknown): string[] {
  const leaks: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    const row = value as Record<string, unknown>;
    for (const key of FAMILY_OMIT_CAPTURE_KEYS) {
      if (key in row && row[key] != null) leaks.push(`${path}.${key}`);
    }
    // extract JSON nested under model_draft-like keys
    for (const [k, v] of Object.entries(row)) {
      if (k === 'extract' || k === 'key_items' || k === 'originals') {
        if (v != null) leaks.push(`${path}.${k}`);
      }
      walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(payload, '');
  return leaks;
}
