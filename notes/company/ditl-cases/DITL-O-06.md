# DITL-O-06 Cases (Alerts + school feed)

**Plan:** [DITL-O-06](../ditl-plans/DITL-O-06.md)
**Preconditions (all cases):** F-OFFICE admin, school feed.

**DITL-O-06-UI-01** | tags: alerts, feed, admin
- Pre: F-OFFICE admin=`ditl-admin`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Create alert for school. 3. Post to school feed. 4. Verify visible in feed tab.
- Expected: Visible to school; delivery confirmed.
- Artifact: none
- DB assert: alerts, feed
- Teardown: delete test, sign out.
- PARTIAL/GAP: none

**DITL-O-06-UI-02** | tags: alerts, feed
- Pre: F-OFFICE admin=`ditl-admin`
- Steps (UI): 1. Sign in as `ditl-admin`. 2. Create alert. 3. Trigger notify path. 4. Verify delivery to school feed.
- Expected: Delivered successfully.
- Artifact: none
- DB assert: alerts, feed, notifications
- Teardown: delete test, sign out.
- PARTIAL/GAP: none
