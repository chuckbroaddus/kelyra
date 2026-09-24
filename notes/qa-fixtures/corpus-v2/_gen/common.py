"""Shared PDF / handwriting / phone helpers for corpus-v2 generators."""
from __future__ import annotations

import io
import json
import math
import os
import random
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps
from reportlab.lib.colors import Color, black, HexColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]  # corpus-v2/
SUPP = Path("/System/Library/Fonts/Supplemental")
SYS = Path("/System/Library/Fonts")

# Prefer TTF handwriting-ish fonts available on macOS
FONT_CANDIDATES = [
    ("HandBradley", SUPP / "Bradley Hand Bold.ttf"),
    ("HandChancery", SUPP / "Apple Chancery.ttf"),
    ("HandComic", SUPP / "Comic Sans MS.ttf"),
    ("HandComicBold", SUPP / "Comic Sans MS Bold.ttf"),
    ("HandChalk", SUPP / "Chalkduster.ttf"),
    ("HandBrush", SUPP / "Brush Script.ttf"),
]

TYPED_FONT = "Helvetica"
TYPED_BOLD = "Helvetica-Bold"

_REGISTERED = False
HAND_FONTS: list[str] = []


def ensure_fonts() -> list[str]:
    global _REGISTERED, HAND_FONTS
    if _REGISTERED:
        return HAND_FONTS
    for name, path in FONT_CANDIDATES:
        if path.exists():
            try:
                pdfmetrics.registerFont(TTFont(name, str(path)))
                HAND_FONTS.append(name)
            except Exception:
                pass
    if not HAND_FONTS:
        HAND_FONTS = [TYPED_FONT]
    _REGISTERED = True
    return HAND_FONTS


NEATNESS = ["neat", "average", "messy", "rushed"]
INK = [
    HexColor("#1a1a2e"),
    HexColor("#0033aa"),
    HexColor("#0b3d91"),
    HexColor("#222222"),
]


def student_style(seed: int) -> dict:
    rng = random.Random(seed)
    fonts = ensure_fonts()
    return {
        "font": fonts[rng.randrange(len(fonts))],
        "size": rng.uniform(10.5, 14.5),
        "ink": INK[rng.randrange(len(INK))],
        "neatness": NEATNESS[rng.randrange(len(NEATNESS))],
        "jitter": {"neat": 0.4, "average": 1.2, "messy": 2.4, "rushed": 3.2}[
            NEATNESS[seed % 4]
        ],
        "scratch_prob": {"neat": 0.05, "average": 0.18, "messy": 0.35, "rushed": 0.28}[
            NEATNESS[seed % 4]
        ],
    }


def draw_header(c: canvas.Canvas, title: str, subtitle: str = ""):
    c.setFont(TYPED_BOLD, 12)
    c.drawString(0.6 * inch, 10.5 * inch, title)
    c.setFont(TYPED_FONT, 8)
    c.setFillColor(HexColor("#555555"))
    c.drawString(0.6 * inch, 10.28 * inch, "CC0 1.0 synthetic fixture · Kelyra QA · not real student work")
    if subtitle:
        c.setFillColor(black)
        c.setFont(TYPED_FONT, 9)
        c.drawString(0.6 * inch, 10.05 * inch, subtitle)
    c.setFillColor(black)
    c.setStrokeColor(HexColor("#cccccc"))
    c.line(0.55 * inch, 9.95 * inch, 7.95 * inch, 9.95 * inch)


def draw_name_line(c: canvas.Canvas, name: str, style: dict, y: float):
    c.setFont(TYPED_FONT, 10)
    c.setFillColor(black)
    c.drawString(0.6 * inch, y, "Name:")
    c.setStrokeColor(HexColor("#999999"))
    c.line(1.05 * inch, y - 2, 4.2 * inch, y - 2)
    write_hand(c, name, 1.1 * inch, y, style)
    c.setFont(TYPED_FONT, 10)
    c.setFillColor(black)
    c.drawString(4.5 * inch, y, "Date:")
    c.line(4.9 * inch, y - 2, 6.5 * inch, y - 2)
    write_hand(c, "09/24/2026", 5.0 * inch, y, style, size_override=10)


def write_hand(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    style: dict,
    size_override: float | None = None,
    scratch: bool | None = None,
):
    ensure_fonts()
    rng = random.Random(hash((text, round(x), round(y), style["font"])) & 0xFFFFFFFF)
    size = size_override or style["size"]
    j = style["jitter"]
    c.setFillColor(style["ink"])
    c.setFont(style["font"], size)
    dx = rng.uniform(-j, j)
    dy = rng.uniform(-j * 0.6, j * 0.6)
    # slight rotation via char-by-char for messy
    if style["neatness"] in ("messy", "rushed") and len(text) > 2:
        cx = x + dx
        for ch in text:
            ang = rng.uniform(-3.5, 3.5)
            c.saveState()
            c.translate(cx, y + dy + rng.uniform(-0.5, 0.5))
            c.rotate(ang)
            c.setFont(style["font"], size + rng.uniform(-0.6, 0.6))
            c.drawString(0, 0, ch)
            c.restoreState()
            cx += c.stringWidth(ch, style["font"], size) * rng.uniform(0.92, 1.08)
    else:
        c.drawString(x + dx, y + dy, text)
    do_scratch = scratch if scratch is not None else (rng.random() < style["scratch_prob"])
    if do_scratch and text.strip():
        w = c.stringWidth(text, style["font"], size)
        c.setStrokeColor(style["ink"])
        c.setLineWidth(1.1)
        c.line(x + dx - 2, y + dy + 3, x + dx + w + 2, y + dy + 1)
        # rewrite above scratch sometimes
        if rng.random() < 0.55:
            c.setFont(style["font"], size)
            c.drawString(x + dx + rng.uniform(-1, 2), y + dy + 9, text)


def answer_profile(idx: int) -> str:
    """Return correctness band for intentional wrong/partial answers."""
    bands = [
        "mostly_correct",
        "one_wrong",
        "partial",
        "several_wrong",
        "mostly_wrong",
        "blank_trailing",
        "scratch_heavy",
        "perfect",
    ]
    return bands[idx % len(bands)]


def mutate_answer(correct: str, profile: str, q_idx: int, rng: random.Random) -> tuple[str, str]:
    """Return (written_answer, grade_tag)."""
    if profile == "perfect":
        return correct, "correct"
    if profile == "mostly_correct":
        if q_idx == 2:
            return _wrong_variant(correct, rng), "wrong"
        return correct, "correct"
    if profile == "one_wrong":
        if q_idx == 0:
            return _wrong_variant(correct, rng), "wrong"
        return correct, "correct"
    if profile == "partial":
        if q_idx % 2 == 0:
            return correct[: max(1, len(correct) // 2)] + "...", "partial"
        return correct, "correct"
    if profile == "several_wrong":
        if q_idx % 2 == 1:
            return _wrong_variant(correct, rng), "wrong"
        return correct, "correct"
    if profile == "mostly_wrong":
        if q_idx != 0:
            return _wrong_variant(correct, rng), "wrong"
        return correct, "correct"
    if profile == "blank_trailing":
        if q_idx >= 5:
            return "", "blank"
        return correct, "correct"
    if profile == "scratch_heavy":
        # will scratch even correct ones
        return correct, "correct_scratched"
    return correct, "correct"


def _wrong_variant(correct: str, rng: random.Random) -> str:
    wrongs = {
        "4": ["5", "3", "8"],
        "x=3": ["x=2", "x=4", "x=-3"],
        "x = 3": ["x = 2", "x = 5"],
        "mitochondria": ["nucleus", "ribosome", "chloroplast"],
        "photosynthesis": ["respiration", "digestion", "fermentation"],
        "1776": ["1789", "1492", "1812"],
        "noun": ["verb", "adjective", "adverb"],
    }
    for k, opts in wrongs.items():
        if correct.lower().startswith(k.lower()) or correct == k:
            return rng.choice(opts)
    # generic mutation
    if correct.isdigit():
        return str(int(correct) + rng.choice([-2, -1, 1, 2]))
    if len(correct) > 3:
        return correct[:-1] + rng.choice(list("aeiouxyz"))
    return correct + "?"


def save_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def new_canvas(path: Path) -> canvas.Canvas:
    path.parent.mkdir(parents=True, exist_ok=True)
    return canvas.Canvas(str(path), pagesize=letter)


def draw_line_graph(c: canvas.Canvas, x: float, y: float, w: float, h: float, points: list[tuple[float, float]], title: str):
    c.setStrokeColor(HexColor("#333333"))
    c.setLineWidth(1)
    c.rect(x, y, w, h, stroke=1, fill=0)
    c.setFont(TYPED_FONT, 8)
    c.drawString(x, y + h + 4, title)
    if len(points) < 2:
        return
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    maxy = max(maxy, miny + 1)
    def sx(v):
        return x + 8 + (v - minx) / (maxx - minx or 1) * (w - 16)
    def sy(v):
        return y + 8 + (v - miny) / (maxy - miny or 1) * (h - 16)
    c.setStrokeColor(HexColor("#0055cc"))
    c.setLineWidth(1.5)
    for i in range(len(points) - 1):
        c.line(sx(points[i][0]), sy(points[i][1]), sx(points[i + 1][0]), sy(points[i + 1][1]))
    c.setFillColor(HexColor("#0055cc"))
    for px, py in points:
        c.circle(sx(px), sy(py), 2.2, stroke=0, fill=1)
    c.setFillColor(black)


def draw_plant_cell(c: canvas.Canvas, x: float, y: float, w: float, h: float):
    """Simple labeled-blank plant cell diagram (synthetic)."""
    c.setStrokeColor(HexColor("#2e7d32"))
    c.setLineWidth(2)
    c.roundRect(x, y, w, h, 12, stroke=1, fill=0)
    c.setStrokeColor(HexColor("#66bb6a"))
    c.setLineWidth(1)
    c.roundRect(x + 8, y + 8, w - 16, h - 16, 10, stroke=1, fill=0)
    # nucleus
    c.setFillColor(HexColor("#ffe082"))
    c.setStrokeColor(HexColor("#f9a825"))
    c.circle(x + w * 0.55, y + h * 0.55, 18, stroke=1, fill=1)
    # chloroplasts
    c.setFillColor(HexColor("#81c784"))
    c.setStrokeColor(HexColor("#388e3c"))
    for ox, oy in [(0.25, 0.3), (0.3, 0.7), (0.75, 0.28)]:
        c.ellipse(x + w * ox - 12, y + h * oy - 7, x + w * ox + 12, y + h * oy + 7, stroke=1, fill=1)
    # vacuole
    c.setFillColor(HexColor("#bbdefb"))
    c.setStrokeColor(HexColor("#1976d2"))
    c.ellipse(x + w * 0.28 - 22, y + h * 0.5 - 16, x + w * 0.28 + 22, y + h * 0.5 + 16, stroke=1, fill=1)
    c.setFillColor(black)
    c.setFont(TYPED_FONT, 7)
    # leader lines to blank labels
    labels = [
        (x + w * 0.55, y + h * 0.55 + 18, x + w + 8, y + h * 0.85, "A ________"),
        (x + w * 0.25, y + h * 0.3, x - 4, y + h * 0.15, "B ________"),
        (x + w * 0.28, y + h * 0.5, x - 4, y + h * 0.55, "C ________"),
        (x + w * 0.9, y + h * 0.5, x + w + 8, y + h * 0.45, "D ________"),
    ]
    c.setStrokeColor(HexColor("#666666"))
    for x0, y0, x1, y1, lab in labels:
        c.line(x0, y0, x1, y1)
        c.setFillColor(black)
        c.drawString(x1 if x1 > x0 else x1 - 55, y1, lab)


def pdf_page_to_phone_jpg(
    pdf_path: Path,
    page_index: int,
    out_jpg: Path,
    seed: int = 0,
    quality: int = 72,
):
    """Rasterize one PDF page and apply mild phone-photo simulation."""
    rng = random.Random(seed)
    out_jpg.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="corpus_phone_") as td:
        td_path = Path(td)
        prefix = td_path / "page"
        # pdftoppm is 1-indexed
        cmd = [
            "pdftoppm",
            "-f",
            str(page_index + 1),
            "-l",
            str(page_index + 1),
            "-r",
            "110",
            "-jpeg",
            "-jpegopt",
            "quality=90",
            str(pdf_path),
            str(prefix),
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        srcs = sorted(td_path.glob("page*.jpg"))
        if not srcs:
            srcs = sorted(td_path.glob("page*.jpeg"))
        if not srcs:
            raise RuntimeError(f"pdftoppm produced no images for {pdf_path} page {page_index}")
        img = Image.open(srcs[0]).convert("RGB")
        # slight perspective via transform
        w, h = img.size
        dx = int(w * rng.uniform(0.02, 0.05))
        dy = int(h * rng.uniform(0.015, 0.04))
        coeffs = _perspective_coeffs(
            (0, 0, w, 0, w, h, 0, h),
            (dx, dy, w - dx // 2, dy // 2, w - dx, h - dy, dx // 3, h - dy // 2),
        )
        img = img.transform((w, h), Image.PERSPECTIVE, coeffs, Image.BICUBIC, fillcolor=(40, 40, 45))
        # soft shadow / vignette
        overlay = Image.new("RGB", img.size, (30, 30, 35))
        img = Image.blend(img, overlay, rng.uniform(0.04, 0.10))
        img = ImageEnhance.Brightness(img).enhance(rng.uniform(0.92, 1.05))
        img = ImageEnhance.Contrast(img).enhance(rng.uniform(0.95, 1.08))
        # light noise
        if rng.random() < 0.8:
            noise = Image.effect_noise(img.size, rng.uniform(6, 14)).convert("RGB")
            img = Image.blend(img, noise, 0.04)
        # shrink a bit for size budget
        max_w = 1000
        if img.width > max_w:
            nh = int(img.height * max_w / img.width)
            img = img.resize((max_w, nh), Image.LANCZOS)
        img.save(out_jpg, "JPEG", quality=quality, optimize=True)


def _perspective_coeffs(src, dst):
    """Map src quad to dst quad; both are 8-tuples (x0,y0,...,x3,y3)."""
    # Pure-python 8x8 solve (no numpy)
    matrix = []
    for i in range(4):
        x, y = src[2 * i], src[2 * i + 1]
        u, v = dst[2 * i], dst[2 * i + 1]
        matrix.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        matrix.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    A = matrix
    b = [dst[i] for i in range(8)]
    # Gaussian elimination
    n = 8
    M = [A[i][:] + [b[i]] for i in range(n)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[piv] = M[piv], M[col]
        div = M[col][col] or 1e-12
        for j in range(col, n + 1):
            M[col][j] /= div
        for r in range(n):
            if r == col:
                continue
            factor = M[r][col]
            for j in range(col, n + 1):
                M[r][j] -= factor * M[col][j]
    return [M[i][n] for i in range(n)]


def page_count_pdf(path: Path) -> int:
    try:
        out = subprocess.check_output(["pdfinfo", str(path)], text=True)
        for line in out.splitlines():
            if line.lower().startswith("pages:"):
                return int(line.split(":")[1].strip())
    except Exception:
        pass
    return -1
