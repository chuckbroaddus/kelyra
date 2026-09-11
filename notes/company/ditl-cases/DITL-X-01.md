# DITL-X-01 Cases (Author Studio pack emit)

**Plan:** [DITL-X-01](../ditl-plans/DITL-X-01.md)
**Preconditions (all cases):** Author studio (separate repo), X-01 only.

**DITL-X-01-GAP-01** | tags: studio, X-01 (GAP)
- Pre: Author studio access (separate repo `kelyra-author`)
- Steps (UI): 1. Open Author studio. 2. Attempt pack emit (studio only path). 3. Note explicit skip to author sample.
- Expected: Explicit GAP documented; steps say skip + path to author sample; no class-app cases executed.
- Artifact: none
- DB assert: none (separate repo)
- Teardown: none
- PARTIAL/GAP: explicit GAP, separate repo, no class-app cases; studio skip OK if documented

