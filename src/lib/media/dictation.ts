/**
 * DEVICE-STT: dictation that prefers the device's own speech recognition and falls
 * back to AI transcription only when that is unavailable.
 *
 * - Web: the browser's Web Speech API (via expo-speech-recognition's web module).
 * - iOS / Android custom builds: Apple / Google speech recognition via expo-speech-recognition.
 * - Expo Go (no native module), unsupported browsers, denied speech permission, or a
 *   recognizer that fails to start: record audio and send it to the transcribe-audio
 *   Edge Function (AI), exactly as before.
 */
import { Platform } from 'react-native';

import { transcribeAudioDirect } from '@/lib/matching/captureSpeech';
import { startLiveRecording } from '@/lib/media/recorder';
import {
  applyDictationResult,
  dictationValue,
  EMPTY_DICTATION,
  type DictationText,
} from '@/lib/media/dictationText';

export type DictationMode = 'device' | 'ai';

export type Dictation = {
  mode: DictationMode;
  /** Stops listening and resolves with the full transcript ('' if nothing was heard). */
  stop: () => Promise<string>;
  /** Stops without a transcript. */
  cancel: () => void;
};

export type DictationOptions = {
  /** Device mode only: running transcript while the user speaks. */
  onPartial?: (text: string) => void;
  /** Device mode only: the recognizer ended on its own (silence, time limit, error). */
  onEnded?: () => void;
  /** AI mode only: audio captured, transcription request starting. */
  onTranscribing?: () => void;
  /** Names or terms to bias recognition toward. */
  keyterms?: string[];
};

type SpeechModule = (typeof import('expo-speech-recognition'))['ExpoSpeechRecognitionModule'];

let speechModule: SpeechModule | null | undefined;

/** The native/web recognizer, or null when this runtime has none (e.g. Expo Go). */
function loadSpeechModule(): SpeechModule | null {
  if (speechModule !== undefined) return speechModule;
  try {
    // Lazy require: the package throws at import when its native module is missing (Expo Go).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition') as typeof import('expo-speech-recognition');
    speechModule = mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    speechModule = null;
  }
  return speechModule;
}

/** True when the device recognizer can be used right now (no AI needed). */
export function deviceDictationAvailable(): boolean {
  const mod = loadSpeechModule();
  if (!mod) return false;
  try {
    return mod.isRecognitionAvailable();
  } catch {
    return false;
  }
}

const START_WAIT_MS = 2500;
const END_WAIT_MS = 4000;

async function startDeviceDictation(mod: SpeechModule, opts: DictationOptions): Promise<Dictation | null> {
  if (Platform.OS !== 'web') {
    const permission = await mod.requestPermissionsAsync();
    if (!permission.granted) return null;
  }

  let text: DictationText = EMPTY_DICTATION;
  let started = false;
  let ended = false;
  let stopping = false;
  let failure: string | null = null;
  const subs: Array<{ remove: () => void }> = [];
  const cleanup = () => {
    while (subs.length) subs.pop()?.remove();
  };

  let markEnded: () => void = () => {};
  const endedPromise = new Promise<void>((resolve) => {
    markEnded = resolve;
  });
  let settleStart: (ok: boolean) => void = () => {};
  const startPromise = new Promise<boolean>((resolve) => {
    settleStart = resolve;
  });

  subs.push(
    mod.addListener('start', () => {
      started = true;
      settleStart(true);
    }),
  );
  subs.push(
    mod.addListener('result', (event) => {
      text = applyDictationResult(text, event.isFinal, event.results[0]?.transcript ?? '');
      opts.onPartial?.(dictationValue(text));
    }),
  );
  subs.push(
    mod.addListener('error', (event) => {
      if (!started) {
        settleStart(false);
        return;
      }
      // "no-speech" and "aborted" just mean nothing more to add.
      if (event.error !== 'no-speech' && event.error !== 'aborted') failure = event.message || event.error;
    }),
  );
  subs.push(
    mod.addListener('end', () => {
      ended = true;
      settleStart(started);
      markEnded();
      if (started && !stopping) opts.onEnded?.();
    }),
  );

  try {
    mod.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      contextualStrings: opts.keyterms?.length ? opts.keyterms : undefined,
    });
  } catch {
    cleanup();
    return null;
  }

  const timer = setTimeout(() => settleStart(true), START_WAIT_MS);
  const ok = await startPromise;
  clearTimeout(timer);
  if (!ok) {
    cleanup();
    try {
      mod.abort();
    } catch {
      // already stopped
    }
    return null;
  }

  return {
    mode: 'device',
    async stop() {
      stopping = true;
      if (!ended) {
        try {
          mod.stop();
        } catch {
          markEnded();
        }
        await Promise.race([endedPromise, new Promise((resolve) => setTimeout(resolve, END_WAIT_MS))]);
      }
      cleanup();
      const spoken = dictationValue(text);
      if (!spoken && failure) throw new Error(`Speech recognition stopped: ${failure}`);
      return spoken;
    },
    cancel() {
      stopping = true;
      cleanup();
      try {
        mod.abort();
      } catch {
        // already stopped
      }
    },
  };
}

async function startAiDictation(opts: DictationOptions): Promise<Dictation> {
  const live = await startLiveRecording();
  return {
    mode: 'ai',
    async stop() {
      const audio = await live.stop();
      opts.onTranscribing?.();
      return transcribeAudioDirect({ uri: audio.uri, mimeType: audio.mimeType, keyterms: opts.keyterms });
    },
    cancel() {
      void live.stop().catch(() => {});
    },
  };
}

/** Device speech recognition when this device has it; AI transcription only otherwise. */
export async function startDictation(opts: DictationOptions = {}): Promise<Dictation> {
  const mod = loadSpeechModule();
  if (mod && deviceDictationAvailable()) {
    try {
      const device = await startDeviceDictation(mod, opts);
      if (device) return device;
    } catch {
      // fall through to AI
    }
  }
  return startAiDictation(opts);
}
