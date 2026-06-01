#!/usr/bin/env python3
"""Regenerate *-item-*.html and portfolio pages from Excel + assets/RealEstate."""

import html
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
RE = ROOT / "assets/RealEstate"
XLSX = Path("/Users/shamrikin/Downloads/Dahari Real-Estates.xlsx")
IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}
VID_EXT = {".mp4", ".mov", ".MP4", ".MOV"}
DEFAULT_VIDEO = "assets/RealEstate/Raw%20Vid/f9ca90bb-0085-4c32-8a2d-e6aa4d7471d0.mp4?v=1"

CORNER_SVG = (
    '<svg aria-hidden="true" class="corner-accent" fill="none" height="10" viewbox="0 0 10 10" width="10">'
    '<path d="M0.499951 0.199996L0.499952 9.2M0.199951 0.499995L9.19995 0.499995" stroke="currentColor"></path></svg>'
)

# slug -> image search roots (relative to RealEstate), tried in order
IMAGE_ROOTS = {
    "commerce-hamlaacha-30": [
        "Client Image/מבולגן/המלאכה 30",
        "Commerce/Baby star",
    ],
    "commerce-kapulsky": ["Commerce/Kapulsky"],
    "commerce-alpina": ["Commerce/Alpina"],
    "commerce-baby-star": ["Commerce/Baby star"],
    "commerce-kado-home": ["Commerce/Kado home"],
    "commerce-haterufa-4": ["Client Image/התרופה 4", "Client Image/מבולגן/התרופה 4"],
    "commerce-wolt-market": ["Commerce/wolt market"],
    "commerce-hamlaacha-15": [
        "Client Image/מבולגן/מלאכה 15",
        "Client Image/מבולגן/המלאכה 15 אולם תצוגה קרקע",
    ],
    "commerce-sne": ["Commerce/SNE"],
    "logistics-lotus": ["Logistic/Lotus"],
    "logistics-neuralgourd": ["Offices/Neuralgourd"],
    "logistics-addon-optics": ["Offices/Addon optics"],
    "logistics-synerg": ["Offices/Synerg"],
    "offices-swiss": ["Offices/Swiss"],
    "offices-sygma": ["Offices/Sygma"],
    "offices-beit-lid": ["Logistic/בית ליד"],
    "logistics-dgania": ["דגניה-1.jpg"],
    "logistics-hamlaacha-4": ["Raw Vid/המלאכה 4 א.ת פולג נתניה"],
    "residences-bar-ilan-31": ["Residences/בר אילן 31 נתניה", "Client Image/מבולגן/מובחרות סטילס לאתר מאייפון/בר אילן 31"],
    "residences-chen-14": ["Client Image/מבולגן/המלאכה 30"],
    "residences-shapira-24": ["שפירא.pdf"],
    "residences-weizmann-raanana": ["Client Image/מבולגן/המלאכה 30"],
}

VIDEO_HINTS = {
    "commerce-hamlaacha-30": ["המלאכה 30", "בייבי", "baby"],
    "commerce-baby-star": ["בייבי", "baby", "המלאכה 30"],
    "commerce-sne": ["SNE"],
    "commerce-kapulsky": ["קפולסקי", "Kapulsky"],
    "logistics-hamlaacha-4": ["המלאכה 4"],
    "offices-beit-lid": ["בית ליד"],
    "commerce-haterufa-4": ["התרופה", "דהרי"],
    "commerce-hamlaacha-15": ["המלאכה 15", "דהרי"],
}

SECTION_META = {
    "commerce": {
        "prefix": "commerce",
        "page_class": "dh-page-property-item",
        "cat_he": "נדל״ן מסחרי",
        "cat_html": "commerce.html",
        "title_prefix": "דהרי — נדל״ן מסחרי",
        "related_label": "עוד פרויקטים בנדל״ן המסחרי",
        "portfolio_head": "נכסים מסחריים במיקומים שמזינים צמיחה.",
        "portfolio_aria": "פורטפוליו מסחרי",
    },
    "logistics": {
        "prefix": "logistics",
        "page_class": "dh-page-logistics-item",
        "cat_he": "לוגיסטיקה",
        "cat_html": "logistics.html",
        "title_prefix": "דהרי — לוגיסטיקה",
        "related_label": "עוד פרויקטים בלוגיסטיקה",
        "portfolio_head": "החברות שלנו לא רק נכנסות לשוק<br/>הן מגדירות אותו.",
        "portfolio_aria": "הפורטפוליו שלנו",
    },
    "offices": {
        "prefix": "offices",
        "page_class": "dh-page-property-item",
        "cat_he": "משרדים",
        "cat_html": "offices.html",
        "title_prefix": "דהרי — משרדים",
        "related_label": "עוד פרויקטים במשרדים",
        "portfolio_head": "חללי עבודה שמאפשרים צמיחה ארגונית.",
        "portfolio_aria": "פורטפוליו משרדים",
    },
    "residences": {
        "prefix": "residences",
        "page_class": "dh-page-property-item",
        "cat_he": "מגורים",
        "cat_html": "residences.html",
        "title_prefix": "דהרי — מגורים",
        "related_label": "עוד פרויקטים במגורים",
        "portfolio_head": "פרויקטי מגורים באיכות גבוהה ובמיקומים מבוקשים.",
        "portfolio_aria": "פורטפוליו מגורים",
    },
}

# Excel address -> slug + section override
PROJECTS = [
    {"slug": "commerce-hamlaacha-30", "section": "commerce", "address_key": "דהרי המלאכה 30"},
    {"slug": "commerce-kapulsky", "section": "commerce", "address_key": "קפולסקי"},
    {"slug": "commerce-alpina", "section": "commerce", "address_key": "Alpina"},
    {"slug": "logistics-lotus", "section": "logistics", "address_key": "Lotus"},
    {"slug": "logistics-neuralgourd", "section": "logistics", "address_key": "Neuralgourd"},
    {"slug": "logistics-addon-optics", "section": "logistics", "address_key": "Addon optics"},
    {"slug": "commerce-baby-star", "section": "commerce", "address_key": "Baby star"},
    {"slug": "commerce-kado-home", "section": "commerce", "address_key": "Kado home"},
    {"slug": "commerce-haterufa-4", "section": "commerce", "address_key": "דהרי התרופה 4"},
    {"slug": "commerce-wolt-market", "section": "commerce", "address_key": "wolt market"},
    {"slug": "offices-swiss", "section": "offices", "address_key": "Swiss"},
    {"slug": "logistics-synerg", "section": "logistics", "address_key": "Synerg"},
    {"slug": "commerce-hamlaacha-15", "section": "commerce", "address_key": "דהרי המלאכה 15"},
    {"slug": "commerce-sne", "section": "commerce", "address_key": "SNE"},
    {"slug": "offices-sygma", "section": "offices", "address_key": "Sygma"},
    {"slug": "offices-beit-lid", "section": "offices", "address_key": "דהרי בית ליד"},
    {"slug": "logistics-dgania", "section": "logistics", "address_key": "דהרי דגניה"},
    {"slug": "residences-bar-ilan-31", "section": "residences", "address_key": "דהרי – בר אילן 31"},
    {"slug": "residences-chen-14", "section": "residences", "address_key": "שדרות חן 14"},
    {"slug": "residences-shapira-24", "section": "residences", "address_key": "משה שפירא 24"},
    {"slug": "logistics-hamlaacha-4", "section": "logistics", "address_key": "המלאכה 4"},
    {"slug": "residences-weizmann-raanana", "section": "residences", "address_key": "ויצמן"},
]


def read_xlsx(path):
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    with zipfile.ZipFile(path) as z:
        shared = []
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(".//m:si", ns):
            texts = [t.text or "" for t in si.findall(".//m:t", ns)]
            shared.append("".join(texts))
        ws = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
        rows = []
        for row in ws.findall(".//m:sheetData/m:row", ns):
            vals = []
            for c in row.findall("m:c", ns):
                t = c.attrib.get("t")
                v = c.find("m:v", ns)
                if v is None:
                    vals.append("")
                elif t == "s":
                    vals.append(shared[int(v.text)])
                else:
                    vals.append(v.text)
            rows.append(vals)
    return rows


def clean_text(s):
    if not s:
        return ""
    s = s.replace("\xa0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return s


def first_line(s):
    s = clean_text(s)
    if not s:
        return ""
    return s.split("\n")[0].strip()


def body_text(long_desc, short_desc):
    long_desc = (long_desc or "").strip()
    short_desc = clean_text(short_desc)
    if long_desc:
        parts = [p.strip() for p in re.split(r"\n\s*\n", long_desc) if p.strip()]
        return " ".join(parts[:3]) if parts else long_desc.replace("\n", " ")
    return short_desc


def area_text(built, area):
    for val in (built, area):
        v = clean_text(val)
        if v:
            line = v.split("\n")[0]
            if "מ" in line or "מר" in line or "מ״ר" in line:
                return line
    v = clean_text(built) or clean_text(area)
    return v.split("\n")[0] if v else ""


def display_title(address):
    address = clean_text(address)
    if address.startswith("דהרי"):
        address = re.sub(r"^דהרי\s*[–\-]?\s*", "", address).strip()
    return address


def is_latin_title(title):
    return bool(re.match(r"^[A-Za-z0-9][A-Za-z0-9\s\.\-&']*$", title))


def url_path(rel):
    parts = rel.replace("\\", "/").split("/")
    return "/".join(quote(p, safe="") for p in parts)


def collect_images(rel_path):
    p = RE / rel_path
    if p.is_file() and p.suffix.lower() in IMG_EXT:
        return [p]
    if not p.exists():
        return []
    files = [
        f
        for f in p.rglob("*")
        if f.is_file()
        and f.suffix.lower() in IMG_EXT
        and "small" not in f.name.lower()
    ]
    files.sort(key=lambda f: (-f.stat().st_size, f.name.lower()))
    return files


def asset_url(path: Path) -> str:
    rel = path.relative_to(RE).as_posix()
    return url_path("assets/RealEstate/" + rel)


def find_images(slug):
    roots = IMAGE_ROOTS.get(slug, [])
    for rel in roots:
        if rel.endswith((".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG")):
            p = RE / rel
            if p.is_file():
                return [asset_url(p)]
        imgs = collect_images(rel)
        if imgs:
            return [asset_url(f) for f in imgs[:7]]
    tokens = [t for t in re.split(r"[-\s]+", slug) if len(t) > 2]
    best = []
    for f in RE.rglob("*"):
        if f.is_file() and f.suffix.lower() in IMG_EXT:
            path_l = str(f).lower()
            if any(t in path_l for t in tokens):
                best.append(f)
    best.sort(key=lambda x: -x.stat().st_size)
    if best:
        return [asset_url(best[0])]
    fallback = RE / "DJI_0708.jpg"
    if fallback.exists():
        return [asset_url(fallback)]
    return [url_path("assets/placeholders/logistics-biotech-lab.jpg")]


def find_video(slug):
    hints = VIDEO_HINTS.get(slug, [])
    videos = [f for f in RE.rglob("*") if f.is_file() and f.suffix in VID_EXT]
    if hints:
        for f in videos:
            name = str(f)
            if any(h.lower() in name.lower() for h in hints):
                return asset_url(f)
    for f in videos:
        if slug.replace("-", " ") in str(f).lower():
            return asset_url(f)
    return DEFAULT_VIDEO


def title_html(title):
    if is_latin_title(title):
        return f'<h2 class="dh-logistics-item__title"><span dir="ltr" lang="en">{html.escape(title)}</span></h2>'
    return f"<h2 class=\"dh-logistics-item__title\">{html.escape(title)}</h2>"


def breadcrumb_current(title):
    if is_latin_title(title):
        return f'<span aria-current="page" class="dh-breadcrumbs__current"><span dir="ltr" lang="en">{html.escape(title)}</span></span>'
    return f'<span aria-current="page" class="dh-breadcrumbs__current">{html.escape(title)}</span>'


def build_item_page(project, all_in_section):
    meta = SECTION_META[project["section"]]
    filename = project["filename"]

    title = project["title"]
    tagline = project["tagline"]
    body = project["body"]
    address = project["address"]
    area = project["area"]
    images = project["images"]
    video = project["video"]
    hero = images[0]
    gallery = images[1:7]
    if len(gallery) < 6:
        gallery = (gallery + images * 6)[:6]

    related = [p for p in all_in_section if p["slug"] != project["slug"]][:3]
    related_html = []
    for r in related:
        related_html.append(
            f"""<li role="listitem">
<a aria-label="מעבר לעמוד הפרויקט — {html.escape(r['title'])}" class="dh-logistics-item__related-card" href="{html.escape(r['filename'])}">
<span class="dh-logistics-item__related-media">
<img alt="" decoding="async" height="540" loading="lazy" referrerpolicy="no-referrer" src="{html.escape(r['images'][0])}" width="960"/>
</span>
<span class="dh-logistics-item__related-name">{html.escape(r['title'])}</span>
</a>
</li>"""
        )

    gallery_li = "\n".join(
        f'<li role="listitem"><img alt="" decoding="async" height="600" loading="lazy" referrerpolicy="no-referrer" src="{html.escape(src)}" width="960"/></li>'
        for src in gallery
    )

    floor_row = ""
    if project.get("floor"):
        floor_row = f'<div class="dh-logistics-item__meta-row" role="listitem"><span class="dh-logistics-item__meta-label">קומה</span><span>{html.escape(project["floor"])}</span></div>\n'

    page = f"""<!DOCTYPE html>

<html class="{meta['page_class']}" dir="rtl" lang="he">
<head>
<meta charset="utf-8"/>
<script src="dh-page-transition-boot.js?v=1"></script>
<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>
<title>{html.escape(meta['title_prefix'])} — {html.escape(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@500;600;700&amp;family=Rubik:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="index-layout.css?v=62" rel="stylesheet"/>
<link href="dh-side-header888.css?v=62" rel="stylesheet"/>
<link href="dh-logistics-item.css?v=49" rel="stylesheet"/>
</head>
<body>
<a class="dh-skip-link" href="#dh-main-content">דלג לתוכן הראשי</a>
<div class="dh-side-header888" dir="rtl" lang="he">
<div class="dh-side-header888__layout888">
<aside aria-hidden="true" class="dh-side-header888__rail888">
<div class="dh-side-header888__spacer888"></div>
<div class="dh-side-header888__spacer888"></div>
</aside>
<div class="dh-side-header888__content888" data-menu-inert-target="">
<a aria-label="דהרי — עמוד הבית" class="dh-corner-logo" href="index.html">
<img alt="" decoding="async" height="77" src="assets/black%20logo.svg" width="425"/>
</a>
<main class="dh-main-content dh-main-content--logistics-item" id="dh-main-content" tabindex="-1">
<h1 class="dh-sr-only">{html.escape(meta['title_prefix'])} — {html.escape(title)}</h1>
<nav aria-label="מיקום בעמוד" class="dh-breadcrumbs">
<p class="dh-breadcrumbs__track">
<a href="index.html">דף הבית</a>
<span aria-hidden="true" class="dh-breadcrumbs__sep">·</span>
<a href="{meta['cat_html']}">{meta['cat_he']}</a>
<span aria-hidden="true" class="dh-breadcrumbs__sep">·</span>
{breadcrumb_current(title)}
</p>
</nav>
<article class="dh-logistics-item" dir="rtl" lang="he">

{title_html(title)}
<p class="dh-logistics-item__tagline">{html.escape(tagline)}</p>
<p class="dh-logistics-item__body">{html.escape(body)}</p>
<div class="dh-logistics-item__hero">
<figure class="dh-logistics-item__media">
<img alt="" decoding="async" height="675" loading="lazy" referrerpolicy="no-referrer" src="{html.escape(hero)}" width="1200"/>
</figure>
<div class="dh-logistics-item__video-side">
<div class="dh-logistics-item__video-wrap">
<video aria-label="סרטון הדגמה לפרויקט" class="dh-logistics-item__video" controls="" autoplay="" muted="" playsinline="" poster="{html.escape(hero)}" preload="auto">
<source src="{html.escape(video)}" type="video/mp4"/>
</video>
</div>
<div class="dh-logistics-item__meta" role="list">
<div class="dh-logistics-item__meta-row" role="listitem"><span class="dh-logistics-item__meta-label">כתובת</span><span>{html.escape(address)}</span></div>
{floor_row}<div class="dh-logistics-item__meta-row" role="listitem"><span class="dh-logistics-item__meta-label">שטח</span><span>{html.escape(area)}</span></div>
</div>
</div>
</div>
<div aria-label="גלריה" class="dh-logistics-item__gallery">
<ul class="dh-logistics-item__gallery-grid" role="list">
{gallery_li}
</ul>
</div>
<section aria-label="פרויקטים נוספים" class="dh-logistics-item__related">
<ul class="dh-logistics-item__related-grid" role="list">
{"".join(related_html)}
</ul>
</section>
</article>
</main>
</div>
</div>
<div aria-hidden="true" aria-label="תפריט ניווט באתר" aria-modal="true" class="dh-side-header888__overlay888" data-menu-overlay="" id="dh-main-menu-dialog" role="dialog">
<div aria-hidden="true" class="dh-side-header888__overlay-plate888"></div>
<div class="dh-side-header888__menu-shell888">
<nav aria-label="פריטי תפריט" class="dh-side-header888__menu-nav888">
<a class="dh-side-header888__menu-link888" href="index.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">01</span>
<span class="dh-side-header888__menu-link-text888">עמוד הבית</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Home</span>
</a>
<a class="dh-side-header888__menu-link888" href="logistics.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">02</span>
<span class="dh-side-header888__menu-link-text888">לוגיסטיקה</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Logistics</span>
</a>
<a class="dh-side-header888__menu-link888" href="offices.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">03</span>
<span class="dh-side-header888__menu-link-text888">משרדים</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Offices</span>
</a>
<a class="dh-side-header888__menu-link888" href="residences.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">04</span>
<span class="dh-side-header888__menu-link-text888">מגורים</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Residences</span>
</a>
<a class="dh-side-header888__menu-link888" href="commerce.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">05</span>
<span class="dh-side-header888__menu-link-text888">נדל״ן מסחרי</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Commercial</span>
</a>
<a class="dh-side-header888__menu-link888" href="about.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">06</span>
<span class="dh-side-header888__menu-link-text888">אודות</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">About</span>
</a>
<a class="dh-side-header888__menu-link888" href="contact.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">07</span>
<span class="dh-side-header888__menu-link-text888">יצירת קשר</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Contact</span>
</a>
</nav>
<nav aria-label="רשתות חברתיות" class="dh-side-header888__menu-social888" dir="ltr">
<ul class="dh-side-header888__menu-social-list888" role="list">
<li>
<a aria-label="אינסטגרם" class="dh-side-header888__menu-social888-link" href="https://www.instagram.com/" rel="noopener noreferrer" target="_blank">
<svg aria-hidden="true" fill="currentColor" focusable="false" viewbox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path></svg>
</a>
</li>
<li>
<a aria-label="פייסבוק" class="dh-side-header888__menu-social888-link" href="https://www.facebook.com/" rel="noopener noreferrer" target="_blank">
<svg aria-hidden="true" fill="currentColor" focusable="false" viewbox="0 0 24 24"><path d="M24 12.073C24 5.446 18.627.074 12 .074S0 5.446 0 12.073C0 17.075 3.583 21.396 8.422 22.572v-7.049H5.894V12.07h2.528V9.41c0-2.496 1.502-3.874 3.771-3.874 1.095 0 2.239.195 2.239.195v2.459h-1.26c-1.243 0-1.63.772-1.63 1.562v1.875h2.773l-.443 2.854H11.35v7.049C18.065 21.685 24 17.075 24 12.073z"></path></svg>
</a>
</li>
<li>
<a aria-label="יוטיוב" class="dh-side-header888__menu-social888-link" href="https://www.youtube.com/" rel="noopener noreferrer" target="_blank">
<svg aria-hidden="true" fill="currentColor" focusable="false" viewbox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>
</a>
</li>
<li>
<a aria-label="טיקטוק" class="dh-side-header888__menu-social888-link" href="https://www.tiktok.com/" rel="noopener noreferrer" target="_blank">
<svg aria-hidden="true" fill="currentColor" focusable="false" viewbox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0011.14-4.02v-7a8.16 8.16 0 004.48 1.36V7.08a4.85 4.85 0 01-1-.34z"></path></svg>
</a>
</li>
<li>
<a aria-label="לינקדאין" class="dh-side-header888__menu-social888-link" href="https://www.linkedin.com/" rel="noopener noreferrer" target="_blank">
<svg aria-hidden="true" fill="currentColor" focusable="false" viewbox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22 0H2C.9 0 0 .9 0 2v20c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2z"></path></svg>
</a>
</li>
</ul>
</nav>
</div>
</div>
<div class="dh-side-header888__nav-float888">
<nav aria-label="פעולות אתר" class="dh-side-header888__bar-nav888">
<div class="dh-side-header888__nav-item888">
<button aria-controls="dh-main-menu-dialog" aria-expanded="false" aria-haspopup="dialog" aria-label="פתיחת תפריט" class="dh-side-header888__icon-btn888" data-menu-label-close="סגירת תפריט" data-menu-label-open="פתיחת תפריט" data-menu-toggle="" type="button"><span aria-hidden="true" class="dh-side-header888__icon-btn-icons888">
<svg aria-hidden="true" class="dh-side-header888__icon--menu888" focusable="false" viewbox="0 0 24 24">
<path d="M5 7h14"></path>
<path d="M5 12h14"></path>
<path d="M5 17h14"></path>
</svg>
<svg aria-hidden="true" class="dh-side-header888__icon--close888" focusable="false" viewbox="0 0 24 24">
<path d="M6 6l12 12"></path>
<path d="M18 6 6 18"></path>
</svg>
</span></button>
</div>
</nav>
</div>
<script defer="" src="dh-side-header888.js?v=12"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script defer="" src="dh-logistics-item.js?v=34"></script>
</div>
</body>
</html>
"""
    return filename, page


def build_portfolio_slide(project, index, total, iframe=False):
    target = ' rel="noopener" target="_parent"' if iframe else ' rel="noopener"'
    desc = html.escape(first_line(project["tagline"]))
    location = html.escape(project["address"])
    area = html.escape(project["area"])
    img = html.escape(project["images"][0])
    href = html.escape(project["filename"])
    title = html.escape(project["title"])
    corners = CORNER_SVG * 4
    return f"""<div class="swiper-slide wqf-slide">
<div class="wqf-slide-card" style="--hover-logo-color: #dadada;">
<div class="wqf-logo">
<img alt="" class="wqf-logo-img" decoding="async" height="540" loading="lazy" referrerpolicy="no-referrer" src="{img}" width="960"/>
<a class="wqf-area-tag" href="{href}"{target}><img alt="" aria-hidden="true" class="wqf-slide-meta-icon" decoding="async" height="20" src="assets/Icons/House.svg" width="20"/><span class="wqf-slide-meta-text">{area}</span></a></div><div class="wqf-slide-copy"><p class="wqf-slide-location">{location}</p><div class="wqf-slide-desc">
<p class="p2-mono wqf-desc">{desc}</p>
</div></div>
<div class="wqf-expand-grid">
<div class="wqf-expand-inner wqf-cta-row">
<a aria-label="עמוד הפרויקט — {title}" class="wqf-btn" data-theme="dark" href="{href}"{target}>
<div class="wqf-btn-inner">
<div aria-hidden="true" class="button--dot"></div>
<div class="wqf-btn-label p2-mono">
<span>לפרטים נוספים ויצירת קשר</span>
<span aria-hidden="true">לפרטים נוספים ויצירת קשר</span>
</div>
</div>
{corners}
</a>
</div>
</div>
<div aria-hidden="true" class="wqf-card-corners"><span></span><span></span></div>
</div>
</div>"""


def update_portfolio_file(path, section, projects, iframe=False):
    text = path.read_text(encoding="utf-8")
    meta = SECTION_META[section]
    slides = "\n".join(build_portfolio_slide(p, i, len(projects), iframe=iframe) for i, p in enumerate(projects))
    total = len(projects)
    counter = f'<span class="js-wqf-current">01</span> / {total:02d}'

    text = re.sub(
        r"<div class=\"swiper-wrapper\">.*?</div>\s*</div>\s*<div class=\"wqf-nav\">",
        f'<div class="swiper-wrapper">\n{slides}\n</div>\n</div>\n<div class="wqf-nav">',
        text,
        count=1,
        flags=re.DOTALL,
    )
    text = re.sub(
        r"<span class=\"js-wqf-current\">.*?</span> / \d+",
        counter,
        text,
        count=1,
    )
    if "js-split-reveal" in text:
        text = re.sub(
            r"<p class=\"h5 js-split-reveal\">.*?</p>",
            f'<p class="h5 js-split-reveal">{meta["portfolio_head"]}</p>',
            text,
            count=1,
            flags=re.DOTALL,
        )
    path.write_text(text, encoding="utf-8")


def main():
    if not XLSX.exists():
        raise SystemExit(f"Missing Excel file: {XLSX}")

    rows = read_xlsx(XLSX)
    excel_by_key = {}
    for r in rows[1:]:
        addr = clean_text(r[2] if len(r) > 2 else "")
        if not addr:
            continue
        excel_by_key[addr] = {
            "detail": clean_text(r[1] if len(r) > 1 else ""),
            "address": addr,
            "floor": clean_text(r[3] if len(r) > 3 else ""),
            "built": r[4] if len(r) > 4 else "",
            "area": r[5] if len(r) > 5 else "",
            "long_desc": r[6] if len(r) > 6 else "",
            "short_desc": r[7] if len(r) > 7 else "",
        }

    # fuzzy match excel rows to PROJECTS
    built_projects = []
    for spec in PROJECTS:
        row = None
        key = spec["address_key"]
        for addr, data in excel_by_key.items():
            if key in addr or addr in key or key.replace("דהרי ", "") in addr:
                row = data
                break
        if not row:
            print("WARN: no excel row for", spec["slug"])
            continue

        slug = spec["slug"]
        section = spec["section"]
        address = row["address"]
        title = display_title(address)
        body = body_text(row["long_desc"], row["short_desc"])
        tagline = first_line(row["short_desc"])
        if not tagline or tagline == row["detail"] or len(tagline) < 12:
            tagline = first_line(body)[:160] if body else title
        if tagline == body:
            tagline = first_line(row["long_desc"])[:160] or title
        area = area_text(row["built"], row["area"]) or "—"
        images = find_images(slug)
        video = find_video(slug)

        prefix = SECTION_META[section]["prefix"]
        part = slug.split("-", 1)[1]
        filename = f"{prefix}-item-{part}.html"

        built_projects.append(
            {
                "slug": slug,
                "section": section,
                "title": title,
                "tagline": tagline,
                "body": body,
                "address": address,
                "area": area,
                "floor": row["floor"],
                "images": images,
                "video": video,
                "filename": filename,
            }
        )

    # Remove old item pages
    for old in ROOT.glob("*-item-*.html"):
        old.unlink()
        print("Removed", old.name)

    by_section = {}
    for p in built_projects:
        by_section.setdefault(p["section"], []).append(p)

    for section, items in by_section.items():
        for p in items:
            fname, content = build_item_page(p, items)
            (ROOT / fname).write_text(content, encoding="utf-8")
            p["filename"] = fname
            print("Wrote", fname)

    update_portfolio_file(ROOT / "logistics-portfolio-page.html", "logistics", by_section.get("logistics", []), iframe=True)
    print("Updated logistics-portfolio-page.html")

    for section in ("commerce", "offices", "residences"):
        path = ROOT / f"{section}.html"
        if path.exists():
            update_portfolio_file(path, section, by_section.get(section, []), iframe=False)
            print("Updated", path.name)

    print(f"\nDone: {len(built_projects)} project pages generated.")


if __name__ == "__main__":
    main()
