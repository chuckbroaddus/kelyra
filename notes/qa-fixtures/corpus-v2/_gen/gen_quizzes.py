"""Generate 32-student grading quiz packs (answer key, flatbed stack, phone JPGs)."""
from __future__ import annotations

import json
import random
from pathlib import Path

from reportlab.lib.colors import black, HexColor
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter

from content import PACKS
from common import (
    ROOT,
    TYPED_BOLD,
    TYPED_FONT,
    answer_profile,
    draw_header,
    draw_line_graph,
    draw_name_line,
    draw_plant_cell,
    ensure_fonts,
    mutate_answer,
    new_canvas,
    page_count_pdf,
    pdf_page_to_phone_jpg,
    save_json,
    student_style,
    write_hand,
)
from roster import STUDENTS, display_name, roster_json


def _write_questions_md(pack: dict, path: Path):
    lines = [
        f"# {pack['title']}",
        "",
        "License: CC0 1.0 — original synthetic content for Kelyra QA.",
        "",
    ]
    if pack.get("passage"):
        lines += ["## Passage", "", pack["passage"], ""]
    lines.append("## Questions")
    lines.append("")
    for q in pack["questions"]:
        lines.append(f"{q['n']}. {q['prompt']}")
        lines.append(f"   - **Key:** {q['answer']}")
        lines.append("")
    path.write_text("\n".join(lines) + "\n")


def _draw_prompt_block(c, pack, y_start: float) -> float:
    y = y_start
    c.setFont(TYPED_FONT, 9)
    if pack.get("passage"):
        c.setFont(TYPED_BOLD, 9)
        c.drawString(0.6 * inch, y, "Read the passage:")
        y -= 12
        c.setFont(TYPED_FONT, 8)
        text = pack["passage"]
        # wrap
        words = text.split()
        line = ""
        for w in words:
            trial = (line + " " + w).strip()
            if c.stringWidth(trial, TYPED_FONT, 8) > 7.2 * inch:
                c.drawString(0.6 * inch, y, line)
                y -= 10
                line = w
            else:
                line = trial
        if line:
            c.drawString(0.6 * inch, y, line)
            y -= 14
    return y


def build_answer_key(pack: dict, out_dir: Path):
    path = out_dir / "answer-key.pdf"
    c = new_canvas(path)
    draw_header(c, f"ANSWER KEY — {pack['title']}", f"Subject: {pack['subject']} · {len(pack['questions'])} items")
    y = 9.7 * inch
    y = _draw_prompt_block(c, pack, y)
    # graph / diagram on key too
    for q in pack["questions"]:
        if q.get("type") == "graph":
            draw_line_graph(c, 0.7 * inch, y - 1.35 * inch, 3.2 * inch, 1.2 * inch, q["graph_points"], q.get("graph_title", "Graph"))
            y -= 1.5 * inch
        if q.get("type") == "diagram":
            draw_plant_cell(c, 1.2 * inch, y - 1.7 * inch, 3.6 * inch, 1.55 * inch)
            y -= 1.9 * inch
    c.setFont(TYPED_BOLD, 10)
    c.drawString(0.6 * inch, y, "Official answers")
    y -= 16
    c.setFont(TYPED_FONT, 10)
    for q in pack["questions"]:
        c.drawString(0.6 * inch, y, f"{q['n']}. {q['answer']}")
        y -= 14
        if y < 0.8 * inch:
            c.showPage()
            draw_header(c, f"ANSWER KEY (cont.) — {pack['title']}")
            y = 9.7 * inch
    c.setFont(TYPED_FONT, 8)
    c.setFillColor(HexColor("#666666"))
    c.drawString(0.6 * inch, 0.5 * inch, "Teachers: match student responses to this key. Synthetic fixture only.")
    c.save()
    return path


def build_student_page(c, pack: dict, student: dict, idx: int):
    style = student_style(1000 + idx * 17 + hash(pack["id"]) % 97)
    profile = answer_profile(idx)
    rng = random.Random(2000 + idx * 31)
    draw_header(c, pack["title"], f"Period {pack.get('period','P3')} · Student page {idx+1}/32 · simulated handwriting")
    draw_name_line(c, display_name(student), style, 9.7 * inch)
    y = 9.35 * inch
    y = _draw_prompt_block(c, pack, y)

    # place graph/diagram once above Qs that need them
    graph_q = next((q for q in pack["questions"] if q.get("type") == "graph"), None)
    diagram_q = next((q for q in pack["questions"] if q.get("type") == "diagram"), None)
    if graph_q:
        draw_line_graph(
            c,
            0.7 * inch,
            y - 1.25 * inch,
            3.0 * inch,
            1.1 * inch,
            graph_q["graph_points"],
            graph_q.get("graph_title", "Graph"),
        )
        y -= 1.4 * inch
    if diagram_q:
        draw_plant_cell(c, 1.0 * inch, y - 1.55 * inch, 3.4 * inch, 1.4 * inch)
        y -= 1.7 * inch

    tags = []
    for q in pack["questions"]:
        c.setFont(TYPED_FONT, 9)
        c.setFillColor(black)
        prompt = f"{q['n']}. {q['prompt']}"
        # wrap prompt
        words = prompt.split()
        line = ""
        for w in words:
            trial = (line + " " + w).strip()
            if c.stringWidth(trial, TYPED_FONT, 9) > 7.1 * inch:
                c.drawString(0.6 * inch, y, line)
                y -= 11
                line = w
            else:
                line = trial
        if line:
            c.drawString(0.6 * inch, y, line)
            y -= 12
        ans, tag = mutate_answer(q["answer"], profile, q["n"] - 1, rng)
        tags.append({"n": q["n"], "tag": tag, "written": ans})
        scratch = tag == "correct_scratched" or (profile == "scratch_heavy" and rng.random() < 0.5)
        if ans:
            write_hand(c, ans, 0.85 * inch, y, style, scratch=scratch)
        else:
            # blank line
            c.setStrokeColor(HexColor("#bbbbbb"))
            c.line(0.85 * inch, y - 1, 5.5 * inch, y - 1)
        y -= 18
        if y < 0.7 * inch:
            break
    c.setFont(TYPED_FONT, 7)
    c.setFillColor(HexColor("#888888"))
    c.drawString(0.6 * inch, 0.4 * inch, f"id={student['id']} profile={profile} neatness={style['neatness']} · simulated · CC0")
    return tags


def build_stack(pack: dict, out_dir: Path):
    path = out_dir / "stack-flatbed.pdf"
    c = new_canvas(path)
    per_student = []
    for i, st in enumerate(STUDENTS):
        if i:
            c.showPage()
        tags = build_student_page(c, pack, st, i)
        per_student.append({"student_id": st["id"], "name": display_name(st), "answers": tags})
    c.save()
    return path, per_student


def build_phone_samples(stack_pdf: Path, out_dir: Path, count: int = 4):
    phone_dir = out_dir / "stack-phone"
    phone_dir.mkdir(parents=True, exist_ok=True)
    # pick varied pages: 0, 7, 15, 28
    pages = [0, 7, 15, 28][:count]
    outs = []
    for i, p in enumerate(pages):
        out = phone_dir / f"phone-page-{p+1:02d}-student.jpg"
        pdf_page_to_phone_jpg(stack_pdf, p, out, seed=50 + i * 9, quality=70)
        outs.append(out.name)
    return outs


def generate_pack(subject: str):
    ensure_fonts()
    pack = PACKS[subject]
    out_dir = ROOT / "grading" / f"{subject}-quiz-32"
    out_dir.mkdir(parents=True, exist_ok=True)
    _write_questions_md(pack, out_dir / "questions.md")
    save_json(out_dir / "roster.json", roster_json(period=pack.get("period", "P3")))
    key = build_answer_key(pack, out_dir)
    stack, grading = build_stack(pack, out_dir)
    phones = build_phone_samples(stack, out_dir, 4)
    meta = {
        "id": pack["id"],
        "title": pack["title"],
        "subject": subject,
        "license": "CC0-1.0",
        "synthetic": True,
        "handwriting": "simulated",
        "handwriting_note": "Fonts + jitter + scratch-outs via reportlab; not real student handwriting.",
        "student_count": 32,
        "pages_flatbed": page_count_pdf(stack),
        "answer_key": key.name,
        "stack_flatbed": stack.name,
        "stack_phone": phones,
        "intentional_wrong_answers": True,
        "generator": "corpus-v2/_gen/gen_quizzes.py",
        "grading_hints": grading,
    }
    save_json(out_dir / "meta.json", meta)
    print(f"[quiz] {subject}: key={key.name} stack_pages={meta['pages_flatbed']} phones={len(phones)}")
    return meta


def main():
    for subj in ("math", "science", "history", "english"):
        generate_pack(subj)


if __name__ == "__main__":
    main()
