"""Homework packs (smaller stacks) with keys."""
from __future__ import annotations

import random
from pathlib import Path

from reportlab.lib.colors import black, HexColor
from reportlab.lib.units import inch

from content import ENGLISH_HW, MATH_HW
from common import (
    ROOT,
    TYPED_BOLD,
    TYPED_FONT,
    answer_profile,
    draw_header,
    draw_name_line,
    ensure_fonts,
    mutate_answer,
    new_canvas,
    page_count_pdf,
    save_json,
    student_style,
    write_hand,
)
from roster import STUDENTS, display_name, roster_json


def _key(pack, path: Path):
    c = new_canvas(path)
    draw_header(c, f"ANSWER KEY — {pack['title']}")
    y = 9.7 * inch
    c.setFont(TYPED_FONT, 11)
    for q in pack["questions"]:
        c.drawString(0.6 * inch, y, f"{q['n']}. {q['answer']}")
        y -= 16
    c.save()


def _stack(pack, path: Path, n_pages: int):
    c = new_canvas(path)
    for i in range(n_pages):
        if i:
            c.showPage()
        st = STUDENTS[i]
        style = student_style(3000 + i * 13)
        profile = answer_profile(i)
        rng = random.Random(4000 + i)
        draw_header(c, pack["title"], f"Homework · page {i+1}/{n_pages} · simulated handwriting")
        draw_name_line(c, display_name(st), style, 9.7 * inch)
        y = 9.3 * inch
        for q in pack["questions"]:
            c.setFont(TYPED_FONT, 10)
            c.setFillColor(black)
            c.drawString(0.6 * inch, y, f"{q['n']}. {q['prompt']}")
            y -= 14
            ans, tag = mutate_answer(q["answer"].split("(")[0].strip(), profile, q["n"] - 1, rng)
            if ans:
                write_hand(c, ans[:60], 0.9 * inch, y, style, scratch=(tag.endswith("scratched")))
            y -= 22
        c.setFont(TYPED_FONT, 7)
        c.setFillColor(HexColor("#888888"))
        c.drawString(0.6 * inch, 0.45 * inch, f"{st['id']} · simulated · CC0")
    c.save()


def generate_homework():
    ensure_fonts()
    specs = [(MATH_HW, "math-hw-12", 12), (ENGLISH_HW, "english-hw-10", 10)]
    for pack, folder, n in specs:
        out = ROOT / "homework" / folder
        out.mkdir(parents=True, exist_ok=True)
        (out / "questions.md").write_text(
            f"# {pack['title']}\n\nCC0 synthetic.\n\n"
            + "\n".join(f"{q['n']}. {q['prompt']}  \nKey: {q['answer']}\n" for q in pack["questions"])
        )
        save_json(out / "roster.json", roster_json())
        _key(pack, out / "answer-key.pdf")
        _stack(pack, out / "stack-flatbed.pdf", n)
        meta = {
            "id": pack["id"],
            "title": pack["title"],
            "subject": pack["subject"],
            "license": "CC0-1.0",
            "synthetic": True,
            "handwriting": "simulated",
            "pages_flatbed": page_count_pdf(out / "stack-flatbed.pdf"),
            "student_pages": n,
        }
        save_json(out / "meta.json", meta)
        print(f"[hw] {folder}: pages={meta['pages_flatbed']}")


if __name__ == "__main__":
    generate_homework()
