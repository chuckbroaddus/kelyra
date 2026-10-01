/**
 * Module flag for pre-auth splash: survives remounts within a signed-out spell
 * so rotate / blur-return never replays. Reset on sign-out for one fresh play.
 * Kept out of SplashLanding.tsx so AuthProvider can reset without a cycle.
 */

let splashSessionCompleted = false;

export function isSplashSessionCompleted(): boolean {
  return splashSessionCompleted;
}

export function markSplashSessionCompleted(): void {
  splashSessionCompleted = true;
}

/** Call on sign-out so the next signed-out landing can play once. */
export function resetSplashSession(): void {
  splashSessionCompleted = false;
}
