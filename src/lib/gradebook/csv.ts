import { Platform, Share } from 'react-native';

import { formatCell, gradeCell, type Gradebook } from '@/lib/gradebook/api';

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function gradebookToCsv(book: Gradebook): string {
  const header = ['Student', ...book.assignments.map((item) => item.title)];
  const rows = book.students.map((student) => [
    student.display_name,
    ...book.assignments.map((assignment) => formatCell(gradeCell(book, assignment.id, student.id))),
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
}

export async function exportGradebookCsv(book: Gradebook, className: string) {
  const csv = gradebookToCsv(book);
  const filename = `${className.replace(/\s+/g, '-').toLowerCase() || 'class'}-gradebook.csv`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({ message: csv, title: filename });
}
