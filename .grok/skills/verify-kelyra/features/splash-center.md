# Splash centering

## Sub-features

The signed-out splash shows the Kelyra mark and one Sign in button. Centering is whether that mark sits on the same horizontal centerline as the button. This is the settled still, and `/sign-in` with Sign in already visible.

## How to get to it (user POV)

Open Kelyra signed out. Wait until the splash has settled and Sign in is visible. Do not tap a tray. Do not sign in.

## Driving it with ui-drive

`Drive: /sign-in click=[aria-label=Kelyra]`

Chuck 2026-09-28 said prove the settled signed-out splash with Sign in visible, no tray tap. The screen loop will not start without a click. The click is the Kelyra mark already on that screen, not the Sign in button. Do not sign in. Do not open a tray.
