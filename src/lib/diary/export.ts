import { Platform, Share } from 'react-native';

import { ledgerToCsv } from '@/lib/diary/exportCsv';
import type { LedgerEventRow } from '@/lib/diary/types';

export { ledgerToCsv } from '@/lib/diary/exportCsv';

export async function exportLedgerCsv(
  rows: LedgerEventRow[],
  filename = 'my-ledger.csv',
): Promise<'downloaded' | 'shared'> {
  const csv = ledgerToCsv(rows);
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return 'downloaded';
  }
  await Share.share({ message: csv, title: filename });
  return 'shared';
}

export async function copyLedgerCsv(rows: LedgerEventRow[]): Promise<'copied' | 'shared' | 'failed'> {
  const csv = ledgerToCsv(rows);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(csv);
      return 'copied';
    }
  } catch {
    // fall through
  }
  if (Platform.OS === 'web') return 'failed';
  try {
    await Share.share({ message: csv, title: 'My Ledger' });
    return 'shared';
  } catch {
    return 'failed';
  }
}
