/**
 * DEVICE-STT: pure transcript accumulator for device speech recognition.
 * iOS sends one growing interim result per session; Android and the web finalize
 * segment by segment. Finals append; the interim always replaces the last interim.
 */
export type DictationText = { finals: string[]; interim: string };

export const EMPTY_DICTATION: DictationText = { finals: [], interim: '' };

function tidy(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function applyDictationResult(state: DictationText, isFinal: boolean, transcript: string): DictationText {
  const text = tidy(transcript);
  if (isFinal) return { finals: text ? [...state.finals, text] : state.finals, interim: '' };
  return { finals: state.finals, interim: text };
}

export function dictationValue(state: DictationText): string {
  return tidy([...state.finals, state.interim].join(' '));
}

/** Spoken text appended after what was already in the field. */
export function joinDictation(base: string, spoken: string): string {
  const said = tidy(spoken);
  if (!said) return base;
  return base.trim() ? `${base.trim()} ${said}` : said;
}
