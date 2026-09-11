#!/usr/bin/env python3
"""Rebuild ditl-testplans-preview.html from markdown SoT."""
from pathlib import Path
import json

root = Path(__file__).resolve().parents[1] / "notes" / "company"
# when run from repo root via path below
root = Path("/Users/chuckbroaddus/projects/kelyra/notes/company")
plans_dir = root / "ditl-plans"
order = [
    "Index",
    "DITL-P-01",
    "DITL-P-02",
    "DITL-P-03",
    "DITL-T-01",
    "DITL-T-02",
    "DITL-T-03",
    "DITL-T-04",
    "DITL-S-01",
    "DITL-S-02",
    "DITL-S-03",
    "DITL-DH-01",
    "DITL-DH-02",
    "DITL-O-01",
    "DITL-O-02",
    "DITL-O-03",
    "DITL-O-04",
    "DITL-O-05",
    "DITL-O-06",
    "DITL-X-01",
]
tabs = []
index_md = (root / "ditl-testplans.md").read_text(encoding="utf-8")
tabs.append({"id": "Index", "title": "Index", "md": index_md})
for pid in order[1:]:
    p = plans_dir / f"{pid}.md"
    if not p.exists():
        raise SystemExit(f"missing {p}")
    tabs.append({"id": pid, "title": pid.replace("DITL-", ""), "md": p.read_text(encoding="utf-8")})


def esc_json(obj):
    s = json.dumps(obj, ensure_ascii=False)
    return s.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


tabs_js = esc_json(tabs)
html_out = f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
<meta charset=\"utf-8\"/>
<title>DITL test plans</title>
<style>
html,body {{ margin:0; padding:0; background:#161616; color:#eee; font: 14px/1.5 system-ui, sans-serif; }}
a {{ color:#8cb4ff; }}
.tabs {{ display:flex; gap:6px; flex-wrap:wrap; padding:10px 10px 0; border-bottom:1px solid #333; }}
.tabs button {{ appearance:none; border:1px solid #444; background:#222; color:#eee; padding:6px 10px; border-radius:6px; cursor:pointer; }}
.tabs button.active {{ border-color:#8cb4ff; color:#8cb4ff; }}
.meta {{ color:#aaa; font-size:12px; padding:8px 12px 0; }}
article {{ padding:8px 16px 32px; max-width:52rem; color:#eee; }}
article h1,article h2,article h3 {{ margin-top:1.4em; color:#fff; }}
article th, article td {{ border:1px solid #444; padding:6px 8px; text-align:left; vertical-align:top; }}
article table {{ border-collapse:collapse; width:100%; }}
article code {{ font-size:0.9em; background:#222; padding:0 4px; border-radius:3px; }}
article pre {{ overflow:auto; padding:10px; border:1px solid #444; border-radius:8px; background:#1b1b1b; color:#eee; }}
article blockquote {{ border-left:3px solid #444; margin:1em 0; padding:0 12px; color:#ccc; }}
</style>
</head>
<body>
<div class=\"meta\">CEO stamp · t_7ebea568 · REFINE 2026-09-10 · plans only · SoT remains the .md files · UI+Ask dual path</div>
<nav class=\"tabs\" id=\"tabs\"></nav>
<article id=\"view\"></article>
<script src=\"https://cdn.jsdelivr.net/npm/marked/marked.min.js\"></script>
<script>
const TABS = {tabs_js};
const nav = document.getElementById('tabs');
const view = document.getElementById('view');
function show(i) {{
  document.querySelectorAll('.tabs button').forEach((b,j)=>b.classList.toggle('active', j===i));
  view.innerHTML = marked.parse(TABS[i].md);
  view.scrollTop = 0;
  window.scrollTo(0,0);
}}
TABS.forEach((t,i) => {{
  const b = document.createElement('button');
  b.textContent = t.title;
  b.onclick = () => show(i);
  nav.appendChild(b);
}});
show(0);
</script>
</body>
</html>
"""
out = root / "ditl-testplans-preview.html"
out.write_text(html_out, encoding="utf-8")
print("wrote", out, "bytes", out.stat().st_size, "tabs", len(tabs))
