export type LiveDictationUpdate = {
  committed: string;
  interim: string;
  display: string;
};

export type LiveDictation = {
  stop: () => Promise<string>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    length: number;
    0?: { transcript?: string };
  }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof globalThis === 'undefined') return null;
  const w = globalThis as typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Web Speech API only. Native keeps record-then-transcribe (no extra native module). */
export function isLiveDictationSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

function normalizeWords(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function joinWords(left: string, right: string): string {
  const a = normalizeWords(left);
  const b = normalizeWords(right);
  if (!a) return b;
  if (!b) return a;
  return `${a} ${b}`;
}

/** Interim rides after committed finals — what the field shows while speaking. */
export function assembleLiveTranscript(committed: string, interim: string): string {
  return joinWords(committed, interim);
}

/** Typed prefix snapshotted at mic-start, plus the live transcript. */
export function composeDictatedField(base: string, liveTranscript: string): string {
  return joinWords(base, liveTranscript);
}

/** Pure fold of Web Speech `results` (finals + current interims). */
export function transcriptFromRecognitionResults(
  results: ReadonlyArray<{ transcript: string; isFinal: boolean }>,
): LiveDictationUpdate {
  const finals: string[] = [];
  const interims: string[] = [];
  for (const result of results) {
    const text = normalizeWords(result.transcript);
    if (!text) continue;
    if (result.isFinal) finals.push(text);
    else interims.push(text);
  }
  const committed = finals.join(' ').replace(/\s+/g, ' ').trim();
  const interim = interims.join(' ').replace(/\s+/g, ' ').trim();
  return {
    committed,
    interim,
    display: assembleLiveTranscript(committed, interim),
  };
}

export async function startLiveDictation(options: {
  lang?: string;
  onUpdate: (update: LiveDictationUpdate) => void;
  onError?: (error: Error) => void;
}): Promise<LiveDictation> {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    throw new Error('Live dictation is not available in this browser.');
  }

  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = options.lang ?? 'en-US';
  recognition.maxAlternatives = 1;

  let committed = '';
  let interim = '';
  let wantListen = true;

  const emit = () => {
    options.onUpdate({
      committed,
      interim,
      display: assembleLiveTranscript(committed, interim),
    });
  };

  recognition.onresult = (event) => {
    const rows: Array<{ transcript: string; isFinal: boolean }> = [];
    for (let i = 0; i < event.results.length; i += 1) {
      const row = event.results[i];
      rows.push({
        transcript: row[0]?.transcript ?? '',
        isFinal: Boolean(row.isFinal),
      });
    }
    const next = transcriptFromRecognitionResults(rows);
    committed = next.committed;
    interim = next.interim;
    emit();
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      wantListen = false;
      options.onError?.(new Error('Microphone permission is required.'));
    }
  };

  recognition.onend = () => {
    if (!wantListen) return;
    try {
      recognition.start();
    } catch {
      // Already running, or the browser rejected a restart.
    }
  };

  try {
    recognition.start();
  } catch (err) {
    wantListen = false;
    throw err instanceof Error ? err : new Error('Could not start the microphone.');
  }

  return {
    async stop() {
      wantListen = false;
      if (interim) {
        committed = assembleLiveTranscript(committed, interim);
        interim = '';
        emit();
      }
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          // Already stopped.
        }
      }
      return assembleLiveTranscript(committed, interim);
    },
  };
}
