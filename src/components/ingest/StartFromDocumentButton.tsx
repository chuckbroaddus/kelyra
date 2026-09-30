/**
 * Small “Start from a document” entry used by school + syllabus wizards (GB-11).
 */
import { GhostButton } from '@/components/ui/Button';

type Props = {
  label?: string;
  disabled?: boolean;
  onPress: () => void;
};

export function StartFromDocumentButton({
  label = 'Start from a document',
  disabled,
  onPress,
}: Props) {
  return <GhostButton align="left" label={label} onPress={onPress} disabled={disabled} />;
}
