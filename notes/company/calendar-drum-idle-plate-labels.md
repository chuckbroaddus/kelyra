# CAL-DRUM idle plate label hotfix (2026-09-24)

CEO device screenshots: Year center showed `20…`; week plate repeated range in header and body.

**Fixes**
- Year plates always render four-digit year; `allowFontScaling={false}`; fontSize 24.
- `yearTile.sideCaption` = full year (no `'YY`).
- Week plate: **header = month**, **body = day range**, **footer = year** (CEO 2026-09-24; matches day chrome).
- Month plate: **header = year**, **body = month name** (CEO 2026-09-24).
- Day plate: **header = month**, **body = day number** (vertically centered), **footer = year** (CEO 2026-09-24).

**Year body Mar/Apr** looking cut off: `yearMonthBlocks` still builds full weeks; cards are clipped by the screen bottom under the drum — scroll the Year body to see remaining days. Not a missing-data bug.
