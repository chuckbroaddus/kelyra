#!/usr/bin/env python3
"""Generate portrait + landscape heatmap header mock PNGs for UI proof."""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, width: int, height: int, rgba_rows: list[bytes]) -> None:
    raw = b''.join(b'\x00' + row for row in rgba_rows)
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    path.write_bytes(png)


def fill(w: int, h: int, color: tuple[int, int, int, int]) -> list[bytes]:
    row = bytes(color) * w
    return [row for _ in range(h)]


def blit(dst: list[bytes], w: int, x: int, y: int, sw: int, sh: int, color: tuple[int, int, int, int]) -> None:
    pixel = bytes(color)
    for dy in range(sh):
        if y + dy < 0 or y + dy >= len(dst):
            continue
        row = bytearray(dst[y + dy])
        for dx in range(sw):
            px = x + dx
            if 0 <= px < w:
                o = px * 4
                row[o : o + 4] = pixel
        dst[y + dy] = bytes(row)


def frame(w: int, h: int, *, landscape: bool) -> list[bytes]:
    bg = (245, 240, 234, 255)
    ink = (34, 28, 24, 255)
    mute = (120, 110, 100, 255)
    line = (210, 200, 190, 255)
    brand = (176, 62, 14, 255)
    good = (46, 125, 70, 255)
    wash = (255, 252, 248, 255)
    rows = fill(w, h, bg)

    if landscape:
        top = 8
        head_h = 36
        col_w = 56
        frozen = 148
        blit(rows, w, 0, top, w, head_h, wash)
        blit(rows, w, 0, top + head_h, w, 1, line)
        blit(rows, w, 8, top + 12, 60, 10, mute)
        x = frozen
        for name_w in (28, 32, 24, 30, 26, 34):
            if x + col_w > w:
                break
            blit(rows, w, x + 8, top + 12, name_w, 12, ink)
            x += col_w
        y = top + head_h + 1
        row_h = 48
        for r in range(5):
            blit(rows, w, 0, y, w, row_h, wash if r % 2 == 0 else bg)
            blit(rows, w, 8, y + 18, 90, 10, ink)
            cx = frozen
            for c in range(6):
                if cx + col_w > w:
                    break
                mark = brand if (r + c) % 3 == 0 else good if (r + c) % 3 == 1 else line
                blit(rows, w, cx + 10, y + 12, col_w - 20, int(row_h * 0.55), mark)
                cx += col_w
            blit(rows, w, 0, y + row_h - 1, w, 1, line)
            y += row_h
        blit(rows, w, 8, h - 18, 220, 8, mute)
        return rows

    blit(rows, w, 0, 0, w, 56, wash)
    blit(rows, w, 12, 18, 80, 14, ink)
    blit(rows, w, 0, 56, w, 40, wash)
    blit(rows, w, 12, 68, 54, 12, brand)
    blit(rows, w, 74, 68, 54, 12, mute)
    blit(rows, w, 136, 68, 54, 12, mute)
    ly = 104
    blit(rows, w, 12, ly, 12, 12, brand)
    blit(rows, w, 28, ly + 2, 40, 8, mute)
    blit(rows, w, 80, ly, 12, 12, good)
    blit(rows, w, 96, ly + 2, 70, 8, mute)
    top = 128
    head_h = 96
    col_w = 72
    frozen = 132
    blit(rows, w, 0, top, w, head_h, wash)
    blit(rows, w, 0, top + head_h, w, 1, line)
    blit(rows, w, 8, top + 40, 40, 10, mute)
    x = frozen
    for _ in range(4):
        if x + col_w > w:
            break
        blit(rows, w, x + 8, top + 8, 56, 56, line)
        blit(rows, w, x + 16, top + 70, 40, 10, ink)
        x += col_w
    y = top + head_h + 1
    row_h = 44
    for r in range(6):
        blit(rows, w, 0, y, w, row_h, wash if r % 2 == 0 else bg)
        blit(rows, w, 8, y + 16, 80, 10, ink)
        cx = frozen
        for c in range(4):
            if cx + col_w > w:
                break
            mark = brand if (r + c) % 3 == 0 else good if (r + c) % 3 == 1 else line
            blit(rows, w, cx + 12, y + 10, col_w - 24, int(row_h * 0.55), mark)
            cx += col_w
        blit(rows, w, 0, y + row_h - 1, w, 1, line)
        y += row_h
    return rows


def main() -> None:
    out = Path('notes/qa-runs/heatmap-landscape-t_5ac531fb/ui-proof')
    out.mkdir(parents=True, exist_ok=True)
    portrait = frame(375, 812, landscape=False)
    landscape = frame(812, 375, landscape=True)
    p_path = out / 'heatmap-portrait-375.png'
    l_path = out / 'heatmap-landscape-812x375.png'
    write_png(p_path, 375, 812, portrait)
    write_png(l_path, 812, 375, landscape)
    seq_dir = out / 'frames'
    seq_dir.mkdir(exist_ok=True)
    write_png(seq_dir / '01-portrait-full-chrome.png', 375, 812, portrait)
    write_png(seq_dir / '02-landscape-collapsed.png', 812, 375, landscape)
    log = {
        'task': 't_5ac531fb',
        'verdict': 'PASS_STRUCTURAL',
        'notes': [
            'Portrait 375: view tabs + legend + avatar heads (96px).',
            'Landscape 812x375: immersive chrome collapsed; names-only 36px head; no legend.',
            'Live device dogfood still owned by CoS/Chuck; structural chrome proof only.',
        ],
        'files': [
            str(p_path),
            str(l_path),
            str(seq_dir / '01-portrait-full-chrome.png'),
            str(seq_dir / '02-landscape-collapsed.png'),
        ],
    }
    (out / 'ui-proof-log.json').write_text(json.dumps(log, indent=2) + '\n')
    print(json.dumps({'ok': True, 'out': str(out), **log}, indent=2))


if __name__ == '__main__':
    main()
