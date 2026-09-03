#!/bin/bash
set -euo pipefail
export HERMES_KANBAN_BOARD="${HERMES_KANBAN_BOARD:-kelyra}"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
hermes kanban boards switch kelyra >/dev/null
hermes kanban list --json > "$OUT_DIR/kanban-data.json"
python3 - << 'PY'
import json, html
from pathlib import Path
from collections import Counter
from datetime import datetime
dash = Path("/Users/chuckbroaddus/projects/kelyra/notes/dashboard")
src = json.loads((dash/"kanban-data.json").read_text())
counts = Counter(t.get("status") for t in src)
rows=[]
for t in sorted(src, key=lambda x: (x.get("priority",99), x.get("title") or "")):
    title=html.escape(t.get("title") or "")
    st=html.escape(t.get("status") or "")
    asg=html.escape(t.get("assignee") or "—")
    tid=html.escape(t.get("id") or "")
    pri=t.get("priority")
    rows.append(f"<tr><td>{tid}</td><td>{pri}</td><td><span class='st {st}'>{st}</span></td><td>{asg}</td><td>{title}</td></tr>")
stat_html=" ".join(f"<div class='chip'><b>{html.escape(str(k))}</b> {v}</div>" for k,v in sorted(counts.items()))
page=f"""<!DOCTYPE html>
<html lang="en">
<meta charset="utf-8">
<title>Kelyra Kanban</title>
<style>
body{{font-family:ui-sans-serif,system-ui,sans-serif;margin:24px;color:#111;background:#f6f6f4}}
h1{{font-size:1.4rem;margin:0 0 8px}}
.meta{{color:#555;margin-bottom:16px}}
.chips{{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 20px}}
.chip{{background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px 12px}}
table{{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e2e2}}
th,td{{text-align:left;padding:8px 10px;border-bottom:1px solid #eee;font-size:14px;vertical-align:top}}
th{{background:#fafafa;position:sticky;top:0}}
.st{{padding:2px 8px;border-radius:999px;font-size:12px}}
.st.blocked{{background:#fde68a}}
.st.done{{background:#bbf7d0}}
.st.ready{{background:#bfdbfe}}
</style>
<h1>Kelyra Company — Kanban</h1>
<p class="meta">Board <code>kelyra</code> · generated {html.escape(datetime.now().strftime('%Y-%m-%d %H:%M'))} · {len(src)} tasks</p>
<div class="chips">{stat_html}</div>
<table>
<thead><tr><th>ID</th><th>Pri</th><th>Status</th><th>Assignee</th><th>Title</th></tr></thead>
<tbody>
{''.join(rows)}
</tbody>
</table>
</html>
"""
(dash/"kanban.html").write_text(page)
print("refreshed", dash/"kanban.html")
PY
