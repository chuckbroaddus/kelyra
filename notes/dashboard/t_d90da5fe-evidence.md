# t_d90da5fe evidence — MathText prose+math+list

## Outcome
kelyra-qa-loop **passed** (0 P0/P1). Run: `wf_01a070d2d3d977008e64202db36a9727`.

## Status
Layout already on main (#10/#11). This card fixed residual **native invisible math** (dogfood P0): embed KaTeX woff2 as `data:` URLs for about:blank WebView.

## Files
- `src/components/ui/MathText.tsx` / `.web.tsx` / `mathTextCore.ts` (prior)
- `src/components/ui/katexMinCss.ts` — data woff2 helper; re-export native CSS
- `src/components/ui/katexMinCssNative.generated.ts` — generated offline fonts
- `scripts/build-katex-native-css.mjs` — regenerate native CSS
- `src/components/ui/mathText.test.ts` — L-01…L-06 + native data-font asserts

## XSS unchanged
`trust:false`, `throwOnError:false`, caps, TRUST_GATED, KaTeX-only innerHTML, native about:blank guards.

## Verify (host)
- `npm run typecheck` exit 0
- `node --experimental-strip-types --test src/components/ui/mathText.test.ts` → 25/25 pass

## Not done here
Surface integration polish → child `t_7017df44`. No commit/push. No SQL.
