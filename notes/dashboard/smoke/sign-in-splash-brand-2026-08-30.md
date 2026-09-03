# Smoke: sign-in splash brand (2026-08-30 ~00:16 CT)

- kelyra-qa-loop session `01a05112-8204-7912-b604-68c69e113bd5` → complete / passed, 0 P0/P1, 0 P2/P3, security ok
- Changed: splash final-frame stills, SplashSignInButton shared neon CTA, school-office footer; tests + ui-design.md
- No SQL / no Edge deploy
- Expo web :8081 HTTP 200 on `/` and `/sign-in` (left running; no restart)
- Look: signed-out reload http://10.0.0.161:8081/sign-in (or phone Expo) — still + neon Sign in + office sentence only
