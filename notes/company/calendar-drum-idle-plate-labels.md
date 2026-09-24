# CAL-DRUM idle plate label hotfix (2026-09-24)

**Idle chrome**
- Year: always 4 digits; allowFontScaling off; fontSize 24.
- Week: header = month, body = day range, footer = year.
- Month: header ~1/3 page (fixed 36px) = year, body = month name.
- Day: header = month, body = centered day number, footer = year.

**Fling silhouette (CEO follow-up)**
- Month/week/day silhouettes clone the same idle chrome (labels + header/footer).
- Softened with silhouetteSoftText opacity; DimOut still wraps.
- Week/day footers were invisible before (silhouetteFooter style missing / wrong chrome).
