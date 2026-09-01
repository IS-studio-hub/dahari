#!/usr/bin/env python3
"""Wrap item hero in image+video row; move gallery after CTA (or after body if no CTA)."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VIDEO_MP4 = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"

GALLERY_RE = re.compile(
    r"(?P<g>\n\s*<div class=\"dh-logistics-item__gallery\"[^>]*>.*?</div>)(?=\s*\n\s*<div class=\"dh-logistics-item__meta\"[^>]*>)",
    re.DOTALL,
)
FIGURE_RE = re.compile(
    r"<figure class=\"dh-logistics-item__media\">\s*(?P<img><img[^>]+/?>)\s*</figure>",
    re.DOTALL,
)


def poster_from_img(img_tag: str) -> str:
    m = re.search(r'src="([^"]+)"', img_tag)
    return m.group(1) if m else ""


def process(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    gm = GALLERY_RE.search(text)
    fm = FIGURE_RE.search(text)
    if not gm or not fm:
        print(f"[skip] {path.name}")
        return False

    gallery_block = gm.group("g").rstrip() + "\n"
    img_tag = fm.group("img").strip()
    poster = poster_from_img(img_tag)

    hero = f"""        <div class="dh-logistics-item__hero">
          <figure class="dh-logistics-item__media">
            {img_tag}
          </figure>
          <div class="dh-logistics-item__video-wrap">
            <video class="dh-logistics-item__video" controls playsinline preload="metadata" poster="{poster}" aria-label="סרטון הדגמה לפרויקט">
              <source src="{VIDEO_MP4}" type="video/mp4" />
            </video>
          </div>
        </div>"""

    text = text.replace(fm.group(0), hero, 1)
    text = GALLERY_RE.sub("", text, count=1)

    if re.search(r'<a class="dh-logistics-item__cta"', text):
        text2, n = re.subn(
            r"(<p>\s*<a class=\"dh-logistics-item__cta\"[\s\S]*?</a>\s*</p>)",
            r"\1" + gallery_block,
            text,
            count=1,
        )
    else:
        text2, n = re.subn(
            r"(<p class=\"dh-logistics-item__body\">[\s\S]*?</p>)(\s*)(</article>)",
            r"\1" + gallery_block + r"\2\3",
            text,
            count=1,
        )
    if n != 1:
        print(f"[warn] insert failed {path.name} n={n}")
        return False

    path.write_text(text2, encoding="utf-8")
    print(f"[ok] {path.name}")
    return True


def main() -> None:
    n = 0
    for path in sorted(ROOT.glob("*-item-*.html")):
        if process(path):
            n += 1
    print("Done,", n, "files")


if __name__ == "__main__":
    main()
