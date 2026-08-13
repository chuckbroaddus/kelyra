/**
 * SpaceXAI adapter. Runs only inside Edge Functions.
 * Set XAI_API_KEY as a function secret. Never ship it in the Expo app.
 *
 * Methods are stubs until feature work begins.
 */

const notImplemented = (name: string) => {
  return Promise.reject(new Error(`AI adapter method "${name}" is not implemented yet`));
};

/** Matches src/lib/ai/types.ts. Implemented in later feature work. */
export const ai = {
  transcribe: () => notImplemented('transcribe'),
  readImage: () => notImplemented('readImage'),
  matchName: () => notImplemented('matchName'),
  draftGaps: () => notImplemented('draftGaps'),
  generatePractice: () => notImplemented('generatePractice'),
};

export const xaiBaseUrl = 'https://api.x.ai/v1';
export const defaultVisionModel = 'grok-4.6';
