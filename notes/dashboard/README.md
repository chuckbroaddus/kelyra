# Kelyra desk dashboard

**Source of truth for Loop queue items (T01, A*, Q*, etc.):** `worklist.json`.

`kanban-data.json` / `kanban.html` are a **Hermes board export** refreshed by `refresh-kanban.sh` (`hermes kanban list --json`). They can lag worklist; do not treat them as SoT for APPLIED/OPEN Loop tickets.

