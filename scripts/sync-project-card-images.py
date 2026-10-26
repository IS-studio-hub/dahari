#!/usr/bin/env python3
"""Keep category-card photos and "אולי יעניין אותך גם" photos on the same image.

Each project page has one photo. It is shown on the category card and on every
recommended card that links to that page. Whichever file was edited last wins,
and the same photo is written back to the category card, every recommended
card, and assets/project-cards.json.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "assets" / "project-cards.json"
CATEGORY_FILES = [ROOT / "commerce.html", ROOT / "offices.html"]

SLIDE_MARKER = '<div class="swiper-slide wqf-slide">'
IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
HREF_RE = re.compile(r'href="([^"]+\.html)"')
ALSO_RE = re.compile(
    r'(<a\b[^>]*class="dh-logistics-item__also-like-card"[^>]*href="([^"]+\.html)"[^>]*>\s*'
    r'<span class="dh-logistics-item__also-like-media">\s*)'
    r"(<img\b[^>]*>)",
    re.S,
)


def attr(tag, name):
    match = re.search(r'\b' + name + r'="([^"]*)"', tag)
    return match.group(1) if match else ""


def set_attr(tag, name, value):
    if re.search(r'\b' + name + r'="', tag):
        return re.sub(
            r'\b' + name + r'="[^"]*"',
            name + '="' + value + '"',
            tag,
            count=1,
        )
    return tag[:-1] + " " + name + '="' + value + '">'


def page_key(href):
    return href.split("/")[-1].split("?")[0]


def category_cards():
    cards = {}
    for path in CATEGORY_FILES:
        if not path.exists():
            continue
        text = path.read_text(encoding="utf-8")
        mtime = path.stat().st_mtime
        for body in text.split(SLIDE_MARKER)[1:]:
            img = None
            for tag in IMG_RE.findall(body):
                if "wqf-logo-img" in tag:
                    img = tag
                    break
            hrefs = HREF_RE.findall(body)
            if not img or not hrefs:
                continue
            key = page_key(hrefs[0])
            cards[key] = {
                "src": attr(img, "src"),
                "alt": attr(img, "alt"),
                "mtime": mtime,
                "file": path,
            }
    return cards


def also_like_files():
    files = []
    for pattern in ("commerce-item-*.html", "offices-item-*.html", "residences-item-*.html"):
        files.extend(ROOT.glob(pattern))
    return files


def read_also(path):
    text = path.read_text(encoding="utf-8")
    found = []
    for match in ALSO_RE.finditer(text):
        img = match.group(3)
        found.append(
            {
                "key": page_key(match.group(2)),
                "src": attr(img, "src"),
                "alt": attr(img, "alt"),
                "mtime": path.stat().st_mtime,
                "file": path,
            }
        )
    return found


def choose(category, copies, prefer_category):
    if prefer_category or not copies:
        return category["src"], category["alt"]
    newest = category
    for copy in copies:
        if copy["src"] != category["src"] and copy["mtime"] >= newest["mtime"]:
            newest = copy
    if newest is category:
        return category["src"], category["alt"]
    return newest["src"], newest["alt"]


def write_category(path, updates):
    text = path.read_text(encoding="utf-8")
    pieces = text.split(SLIDE_MARKER)
    if len(pieces) < 2:
        return False
    changed = False
    rebuilt = [pieces[0]]
    for body in pieces[1:]:
        hrefs = HREF_RE.findall(body)
        key = page_key(hrefs[0]) if hrefs else ""
        img_match = None
        for tag in IMG_RE.finditer(body):
            if "wqf-logo-img" in tag.group(0):
                img_match = tag
                break
        if key in updates and img_match:
            src, alt = updates[key]
            new_img = set_attr(set_attr(img_match.group(0), "src", src), "alt", alt)
            if new_img != img_match.group(0):
                body = body[: img_match.start()] + new_img + body[img_match.end() :]
                changed = True
        rebuilt.append(SLIDE_MARKER + body)
    if not changed:
        return False
    path.write_text("".join(rebuilt), encoding="utf-8")
    return True


def write_also(path, updates):
    text = path.read_text(encoding="utf-8")

    def replacer(match):
        key = page_key(match.group(2))
        if key not in updates:
            return match.group(0)
        src, alt = updates[key]
        img = set_attr(set_attr(match.group(3), "src", src), "alt", alt)
        return match.group(1) + img

    new_text, count = ALSO_RE.subn(replacer, text)
    if new_text == text:
        return False
    path.write_text(new_text, encoding="utf-8")
    return count > 0


def main():
    prefer_category = "--prefer-category" in sys.argv
    cards = category_cards()
    grouped = {key: [] for key in cards}
    item_files = also_like_files()
    for path in item_files:
        for copy in read_also(path):
            if copy["key"] in grouped:
                grouped[copy["key"]].append(copy)

    updates = {}
    payload = {}
    for key, category in cards.items():
        src, alt = choose(category, grouped[key], prefer_category)
        updates[key] = (src, alt)
        payload[key] = {"src": src, "alt": alt}

    written = []
    for path in CATEGORY_FILES:
        if path.exists() and write_category(path, updates):
            written.append(path.name)
    for path in item_files:
        if write_also(path, updates):
            written.append(path.name)

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    previous = JSON_PATH.read_text(encoding="utf-8") if JSON_PATH.exists() else ""
    if previous != encoded:
        JSON_PATH.write_text(encoded, encoding="utf-8")
        written.append(JSON_PATH.name)

    if written:
        print("updated " + ", ".join(written))
    else:
        print("already in sync")


if __name__ == "__main__":
    main()
