import { asLessonResult } from '@/lib/lessons/protocol';
import { lessonWorkFromResult, lessonWorkLines } from '@/lib/lessons/work';

export function metricRows(answers: unknown): Array<{ label: string; value: string }> {
  return lessonWorkLines(lessonWorkFromResult(asLessonResult(answers)));
}
