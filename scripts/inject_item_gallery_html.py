#!/usr/bin/env python3
"""Insert 3×2 gallery markup after the hero <figure> on each *-item-*.html page.

Run after scripts/generate_item_gallery_placeholders.py so assets exist.
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = "</figure>"

GALLERY_TMPL = """
        <div class="dh-logistics-item__gallery" aria-label="גלריה">
          <ul class="dh-logistics-item__gallery-grid" role="list">
{items}
          </ul>
        </div>"""


def gallery_block(stem: str) -> str:
    lines = []
    for k in range(1, 7):
        lines.append(
            f'            <li role="listitem"><img src="assets/placeholders/{stem}-g{k}.jpg" alt="" width="960" height="600" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></li>'
        )
    return GALLERY_TMPL.format(items="\n".join(lines))


def main() -> None:
    for path in sorted(ROOT.glob("*-item-*.html")):
        text = path.read_text(encoding="utf-8")
        if "dh-logistics-item__gallery" in text:
            print(f"[skip] {path.name}")
            continue
        m = re.search(
            r'<figure class="dh-logistics-item__media">\s*<img src="assets/placeholders/([^"]+\.jpg)"',
            text,
        )
        if not m:
            print(f"[warn] no hero img: {path.name}")
            continue
        stem = m.group(1).replace(".jpg", "")
        block = gallery_block(stem)
        if MARKER not in text:
            print(f"[warn] no </figure>: {path.name}")
            continue
        text_new = text.replace(MARKER, MARKER + block, 1)
        path.write_text(text_new, encoding="utf-8")
        print(f"[ok] {path.name}")
    print("Done.")


if __name__ == "__main__":
    main()
