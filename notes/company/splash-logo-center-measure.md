# Splash logo center — measured stills

CoS filed this so the designer can write the option pack. The designer profile has no shell or vision tool. Do not treat this note as the choice.

Method: chroma bounding box of the neon wordmark in the shipped JPGs (not a live browser). Cover + center maps the image center to the viewport center. The Sign in button is the viewport horizontal center in code (`footer.alignItems: 'center'`, `ctaWrap.alignSelf: 'center'`). A live scrollbar or safe-area shift was not measured.

## Mark vs image center

| Still | Size | Letter-box center vs image center |
|---|---|---|
| `assets/brand/splash/kelyra_splash_still_16x9.jpg` | 1920×1080 | +18.5 px X, +4.0 px Y (right) |
| `assets/brand/splash/kelyra_splash_still_9x16.jpg` | 1080×1920 | +26.0 px X, +4.0 px Y (right) |

Y is on the image centerline. X is not. `object-position: center` / `contentFit="cover"` therefore puts the mark to the right of a centered Sign in button.

## Projected miss (mark X minus button X)

Positive means the mark is right of the button.

| Viewport | Asset | Miss |
|---|---|---|
| 390×844 phone or web narrow | 9×16 | +11 px |
| 430×932 phone | 9×16 | +13 px |
| 768×1024 iPad portrait | 9×16 | +18 px |
| 800×800 web (height not greater than width) | 16×9 | +14 px |
| 1024×768 iPad landscape | 16×9 | +13 px |
| 1280×720 web | 16×9 | +12 px |
| 1440×900 web | 16×9 | +15 px |
| 1920×800 web | 16×9 | +18 px |

Phones use the 9×16 still (`phoneLocked`). Web uses `splashAspectForSize` (portrait only when height > width).

## What this does not prove

- Live Sign in button X on a browser with a scrollbar.
- Playback frames. The MP4s are the same aspects; the settled still is the login screen.
- A new composition. The miss is a focal-point shift, not a missing mark.

Letter-box X as a percent of width: 16×9 ≈ 50.9%, 9×16 ≈ 52.4%. One shared `object-position` cannot hit both.
