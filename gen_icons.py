#!/usr/bin/env python3
# Generates UTZLINE Scheduler's icon set: a simple calendar/schedule glyph
# (calendar body + a diagonal "progress" tick) in this app's own accent
# color (#1f8fbf -- a blue/teal, chosen because it's the one hue not
# already used by a sibling app: Site Measure/Viewer are orange-red
# (#c8391c / #ff6a3d), Install ITP is green (#1f8a4c), Manufacture ITP is
# purple (#7c3fd1), UTZLINE Projects is crimson (#ff3b3b)).
from PIL import Image, ImageDraw
import os

OUT = os.path.join(os.path.dirname(__file__), "icons")
os.makedirs(OUT, exist_ok=True)

BG = (14, 22, 26, 255)       # --bg
ACCENT = (31, 143, 191, 255) # --accent #1f8fbf
ACCENT_DK = (20, 102, 138, 255)
WHITE = (240, 250, 253, 255)

def draw_calendar(d, cx, cy, size, color, ring_color):
    # size = overall glyph width
    w = size
    h = size * 0.86
    x0 = cx - w / 2
    y0 = cy - h / 2 + size * 0.06
    r = size * 0.10
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=r, outline=color, width=max(2, int(size * 0.055)))
    # header bar
    header_h = h * 0.26
    d.rounded_rectangle([x0, y0, x0 + w, y0 + header_h], radius=r, fill=color)
    # binder rings
    ring_w = size * 0.06
    ring_h = size * 0.16
    for fx in (0.28, 0.72):
        rx = x0 + w * fx
        d.rounded_rectangle([rx - ring_w / 2, y0 - ring_h * 0.45, rx + ring_w / 2, y0 + ring_h * 0.55],
                             radius=ring_w / 2, fill=ring_color)
    # a couple of date-grid dots below the header (schedule feel)
    grid_top = y0 + header_h + h * 0.14
    dot_r = size * 0.035
    for row in range(2):
        for col in range(4):
            gx = x0 + w * (0.16 + col * 0.23)
            gy = grid_top + row * h * 0.22
            fill = color if (row, col) not in ((1, 3),) else ACCENT
            d.ellipse([gx - dot_r, gy - dot_r, gx + dot_r, gy + dot_r], fill=fill)
    # a checkmark "tick" bottom-right corner to read as "scheduled/on track"
    tick_cx = x0 + w * 0.80
    tick_cy = y0 + h * 0.86
    tick_r = size * 0.14
    d.ellipse([tick_cx - tick_r, tick_cy - tick_r, tick_cx + tick_r, tick_cy + tick_r], fill=ACCENT)
    lw = max(2, int(size * 0.03))
    d.line([tick_cx - tick_r * 0.5, tick_cy, tick_cx - tick_r * 0.1, tick_cy + tick_r * 0.4], fill=WHITE, width=lw)
    d.line([tick_cx - tick_r * 0.1, tick_cy + tick_r * 0.4, tick_cx + tick_r * 0.55, tick_cy - tick_r * 0.35], fill=WHITE, width=lw)

def make_icon(path, size, maskable):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size, size], fill=BG)
        glyph_size = size * 0.62  # keep inside the safe zone
    else:
        d.rounded_rectangle([0, 0, size, size], radius=size * 0.18, fill=BG)
        glyph_size = size * 0.72
    draw_calendar(d, size / 2, size / 2, glyph_size, WHITE, ACCENT_DK)
    img.save(path)

make_icon(os.path.join(OUT, "icon-192.png"), 192, False)
make_icon(os.path.join(OUT, "icon-512.png"), 512, False)
make_icon(os.path.join(OUT, "icon-192-maskable.png"), 192, True)
make_icon(os.path.join(OUT, "icon-512-maskable.png"), 512, True)
print("done")
