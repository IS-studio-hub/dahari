#!/usr/bin/env python3
"""
Generate 6 gallery placeholders per property item (960×600), 3×2 grid on pages.
Local procedural art (gradient + grain) themed to match each hero stem — no external API.
"""
from __future__ import annotations

import hashlib
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "placeholders"

# Two-tone palettes per hero filename stem (matches main photo base names).
STEM_COLORS: dict[str, tuple[tuple[int, int, int], tuple[int, int, int]]] = {
    "commerce-neighborhood-plaza": ((252, 244, 228), (120, 148, 198)),
    "commerce-high-street": ((255, 248, 235), (95, 130, 175)),
    "commerce-strip-junction": ((245, 240, 230), (88, 110, 150)),
    "commerce-mall-interior": ((235, 238, 248), (160, 175, 210)),
    "residences-sea-terraces": ((230, 242, 252), (70, 120, 165)),
    "residences-courtyard-paths": ((236, 245, 232), (110, 140, 105)),
    "residences-family-gardens": ((240, 250, 236), (85, 130, 95)),
    "residences-boutique-market": ((248, 236, 220), (165, 120, 90)),
    "offices-coworking": ((245, 245, 248), (55, 65, 85)),
    "offices-tower-sea": ((220, 232, 245), (60, 95, 140)),
    "offices-green-park": ((235, 245, 235), (75, 115, 95)),
    "offices-campus-train": ((230, 235, 245), (70, 85, 120)),
    "logistics-warehouse-drone": ((238, 238, 240), (90, 95, 110)),
    "logistics-data-control": ((18, 22, 32), (55, 75, 115)),
    "logistics-data-server": ((22, 26, 38), (40, 90, 130)),
    "logistics-biotech-lab": ((248, 252, 255), (180, 205, 225)),
    "logistics-podcast-studio": ((42, 32, 28), (120, 85, 65)),
    "logistics-rothschild-tower": ((248, 242, 228), (95, 110, 135)),
}


def _lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def _jitter(c: tuple[int, int, int], rng: random.Random, amount: int = 22) -> tuple[int, int, int]:
    return tuple(min(255, max(0, int(v + (rng.random() - 0.5) * amount))) for v in c)


def make_image(stem: str, index: int, w: int = 960, h: int = 600) -> Image.Image:
    seed = int(hashlib.sha256(f"{stem}-gallery-{index}".encode()).hexdigest()[:10], 16)
    rng = random.Random(seed)
    c1, c2 = STEM_COLORS[stem]
    c1j, c2j = _jitter(c1, rng, 18), _jitter(c2, rng, 28)

    # Horizontal vs vertical gradient by variation
    vertical = index in (1, 3, 5)
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    if vertical:
        for y in range(h):
            t = y / max(h - 1, 1)
            draw.line([(0, y), (w, y)], fill=_lerp(c1j, c2j, t))
    else:
        for x in range(w):
            t = x / max(w - 1, 1)
            draw.line([(x, 0), (x, h)], fill=_lerp(c1j, c2j, t))

    # Soft diagonal wash
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    alpha = 35 + index * 8
    x0 = int(-w * 0.2 + (index - 1) * 40)
    od.polygon(
        [(x0, h + 20), (x0 + w * 0.55, -20), (x0 + w * 0.9, h + 20)],
        fill=(255, 255, 255, min(alpha, 90)),
    )
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")

    # Film grain
    noise = Image.effect_noise((max(64, w // 5), max(64, h // 5)), 10 + index * 2)
    noise = noise.resize((w, h), Image.Resampling.BILINEAR).convert("RGB")
    noise = ImageEnhance.Contrast(noise).enhance(1.15 + index * 0.04)
    img = Image.blend(img, noise, 0.11 + index * 0.012)

    # Soft vignette (darken corners)
    vig = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vig)
    vd.ellipse(
        (int(-0.08 * w), int(-0.08 * h), int(1.08 * w), int(1.08 * h)),
        fill=255,
    )
    vig = vig.filter(ImageFilter.GaussianBlur(radius=min(w, h) // 26))
    dark = Image.new("RGB", (w, h), (10, 10, 12))
    edge_strength = vig.point(lambda p: int((255 - p) * 0.38))
    img = Image.composite(dark, img, edge_strength)

    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stem in sorted(STEM_COLORS):
        for i in range(1, 7):
            dest = OUT / f"{stem}-g{i}.jpg"
            im = make_image(stem, i)
            im.save(dest, "JPEG", quality=88, optimize=True)
            print(dest.name)
    print("Done:", len(STEM_COLORS) * 6, "files")


if __name__ == "__main__":
    main()
