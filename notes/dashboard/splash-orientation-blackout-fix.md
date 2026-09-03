# Fix splash orientation black-out (CEO 2026-08-30)

## Bug (reproduced by CEO)
On the signed-out splash landing, after the MP4 has played (or during/after), an **orientation switch** (rotate phone, or resize web so portrait↔landscape) **blacks out the final still**. The still **does not come back**. User is left with a black screen + Sign in button.

## Known root cause (already filed P2)
`src/components/ui/SplashLanding.tsx`:
- `Video` is `key={sourceKey}` so rotate remounts a new player for 9×16 vs 16×9.
- `useFocusEffect` depends on `sourceKey`. On source change, React runs the **previous effect cleanup** after the new Video is mounted; cleanup calls `pauseAsync` / `unloadAsync` on `videoRef.current`, which now points at the **new** instance → unloads the fresh player → black frame, and play may never recover cleanly especially once `finishedRef` / end state is confused.

Also related backlog P2 from T30: web `isMuted={false}` prop can clobber muted autoplay fallback on re-render — fix in the same pass if it touches the same component, but **primary acceptance is orientation black-out**.

## Required fix
1. **Orientation / aspect switch must never leave a permanent black void.**
   - After rotate/resize, user must see either:
     - the correct aspect splash playing once, then holding the **last frame**, or
     - if the clip already finished before rotate, show the **final frame** of the new aspect (or replay once then hold) — never black forever.
2. **Cleanup must only run on true blur/unmount of the landing**, not on portrait↔landscape source swap.
   - Do not `unloadAsync` the newly mounted Video from the old effect cleanup.
   - Pattern: focus-only cleanup (empty deps or ref-stable cleanup), or guard unload so it only targets the instance that the effect owned (capture video ref id at effect start).
3. Keyed remount for aspect is OK if play/last-frame recovery is solid. Alternatives OK if simpler (single player + swap source without unload race) as long as both MP4s still used correctly by aspect.
4. Keep existing product rules from prior slices:
   - Play **once** (not endless loop)
   - Audio on when platform allows (AAC in assets; unmuted native; web autoplay policy handled without breaking picture)
   - Neon violet→cyan Sign in CTA (not terracotta Primary)
   - Still routes to `/sign-in`
5. Prefer holding last frame explicitly on `didJustFinish` (pause / seek near end) so end state is stable across remounts if helpful.
6. Update `splashLanding.test.ts` with whatever is assertable (cleanup not tied to sourceKey unload race; orientation helper if extracted). Manual orientation is hard in unit tests — structural fix is enough for Verify.

## Files
- Primary: `src/components/ui/SplashLanding.tsx`
- Tests: `src/components/ui/splashLanding.test.ts`
- Do not break `/sign-in` or auth tests
- Assets stay bundled with audio; no need to re-encode unless required

## Constraints
- `~/projects/kelyra` only. No commit/push. No DNS. Smallest coherent change.
- Mark backlog items fixed in `notes/qa-loop-backlog.md` if you clear:
  - "Orientation switch may unload the newly mounted video (P2)"
  - "Orientation remount still races focus cleanup unload" if listed
  - Optionally the web isMuted re-render P2 if fixed together

## Acceptance
1. Cold open splash → plays once → last frame holds.
2. Rotate or cross the portrait/landscape breakpoint **after** finish → **not black**; correct aspect still (or brief one-shot play then still) visible.
3. Rotate **during** playback → recovers to playing or final still, not permanent black.
4. Sign in still works; typecheck + splash tests green; 0 P0/P1.
