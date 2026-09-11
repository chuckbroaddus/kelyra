# DITL-X-01 — Author Studio pack emit

| Field | Value |
|-------|-------|
| Plan ID | DITL-X-01 |
| Title | Author studio: prepare deck → pack CLI → manifest for class app |
| Primary hat | lesson author (studio user) |
| Other hats | none in class-app chrome |
| Support | SUPPORTED in `kelyra-author` only |
| Regression tags | `author`, `lesson-pack`, `manifest`, `studio` |

## Goal / story

A lesson designer (internal/partner) spends a studio day: prepare source deck under teacher-decks notes, run pack CLI to emit `index.html` + `manifest.json` + media suitable for class-app publish/lesson assignment. This is **not** a school-role daily path in the class app.

## Preconditions / fixtures

- Workspace `~/projects/kelyra-author` available.
- Source deck inputs per Author README / product-design.
- Class app consume path known (lesson pack catalog) but publish may be separate gate.

## Beat list

| # | Beat | Surface |
|---|------|---------|
| 1 | Open Author studio repo / tooling | kelyra-author CLI/docs |
| 2 | Prepare or select source deck | `notes/teacher-decks/` or studio sources |
| 3 | Run pack emit | pack CLI |
| 4 | Verify outputs: index.html, manifest.json, media paths | emit dir |
| 5 | **Reverse:** clean rebuild; fail on bad input without corrupt prior good pack | CLI |
| 6 | Optional: validate manifest fields class app expects | manifest |
| 7 | Hand off pack for class-app lesson assign (pointer; may be other role) | process |
| 8 | Stop — no class-app student login required in this plan | — |

## Lifecycle

Source ready → pack → verify artifacts → done. No class-app sign-out.

## Multiplicity

Multiple packs/decks; one pack must not clobber another’s emit folder if isolated dirs used.

## Reverse / cancel

Rebuild; delete bad emit; do not half-publish.

## Dual-hat

N/A unless same human later teaches — then class-app plans, not this file.

## Functions exercised

Author pack pipeline; manifest emission.

## Explicit non-goals

Class-app chrome DITL; SIS; live teacher Capture; treating studio as office role.

## Scope note for CEO

Research marks Author as studio-only. Include in program for pack regression; **exclude** from nightly class-app device matrix unless pack format changed.

## Dual path note — refine 2026-09-10

Class-app UI+Ask dual path **N/A** (studio CLI day). No `/ask` in kelyra-author. Physical/CLI beats only. Do not invent class-app chrome for authors.

## Suggested QE themes

Deterministic emit; manifest schema; media refs resolve; exclude from class-app Ask matrix.

## Teardown / cleanup (refine-2 2026-09-10)

**Mutating?** Yes — emit directories on disk (studio).

| Created / touched | UI cleanup | Ask cleanup | DB leftover check |
|--------------------|------------|-------------|-------------------|
| Pack emit dir (`index.html`, `manifest.json`, media) | delete isolated out dir tagged `ditl-` | N/A studio | **no** class-app DB; filesystem only |
| Temp bad-input emits | delete | N/A | no corrupt shared golden pack path |

**Order:** verify → delete disposable emit dirs. Keep golden fixtures.
**Isolation:** never write emit into a shared golden path without copy.
