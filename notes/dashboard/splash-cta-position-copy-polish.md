# Splash UI polish after crossfade architecture (CEO OOB 2026-08-30)

Depends on T38 crossfade architecture being in tree.

## Changes
1. **Sign in button position stable:** When the CTA first fades in (after splash complete, form still hidden), place the **Sign in button in the exact same screen position** it occupies after the user taps it and username/password fields appear. No jump when fields reveal. Typical approach: reserve the form block height (or always layout form space with opacity 0 / invisible placeholders) so the button y-position does not change; or put fields above the button in a fixed footer stack where empty form area still takes space when hidden.
2. **Password placeholder:** remove “(6+ characters)”. Use e.g. `Password` only.
3. **Remove kicker:** delete “Sign in with email or @username” above the username field entirely.

## Keep
- CEO JPG stills, crossfade architecture, unified auth, neon button, office footer only when form visible, skip tap, etc.

## Acceptance
- First CTA fade-in and post-reveal CTA share the same button position.
- No kicker text; password placeholder has no 6+ characters hint.
- typecheck + splash tests updated/green.
