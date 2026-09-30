/**
 * Catalog course-level chip picker (admin). FR-LVL-02: teachers do not change level.
 */
import { Chip } from '@/components/ui/Chip';
import { ChipRow } from '@/components/ui/ChipRow';
import type { CourseLevel } from '@/lib/grade/gpa/gpa';
import { listCourseLevelOptions } from '@/lib/grade/gpa/courseLevelPicker';

export type CourseLevelPickerProps = {
  value: string | null | undefined;
  onChange: (key: string) => void;
  levels?: CourseLevel[];
  disabled?: boolean;
};

export function CourseLevelPicker(props: CourseLevelPickerProps) {
  const opts = listCourseLevelOptions(props.levels);
  return (
    <ChipRow>
      {opts.map((o) => (
        <Chip
          key={o.key}
          label={o.label}
          selected={props.value === o.key}
          onPress={() => {
            if (props.disabled) return;
            props.onChange(o.key);
          }}
        />
      ))}
    </ChipRow>
  );
}
