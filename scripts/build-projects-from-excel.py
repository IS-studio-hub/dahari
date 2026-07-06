#!/usr/bin/env python3
"""Regenerate *-item-*.html and portfolio pages from Excel + RealEstate assets."""

import html
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
XLSX = Path("/Users/shamrikin/Downloads/Dahari Real-Estates.xlsx")
REAL_ESTATE = ROOT / "assets" / "RealEstate"
GREY_PLACEHOLDER = "assets/placeholders/grey-placeholder.svg"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
INQUIRY_MAILTO = "info@dahari.co.il"

CORNER_SVG = (
    '<svg aria-hidden="true" class="corner-accent" fill="none" height="10" viewbox="0 0 10 10" width="10">'
    '<path d="M0.499951 0.199996L0.499952 9.2M0.199951 0.499995L9.19995 0.499995" stroke="currentColor"></path></svg>'
)

CATEGORY_MAP = {
    "נדל״ן מסחרי": "commerce",
    "פרוייקטים בהקמה": "offices",
    "מגורים": "residences",
}

SECTION_META = {
    "commerce": {
        "prefix": "commerce",
        "page_class": "dh-page-property-item",
        "cat_he": "נדל״ן מסחרי",
        "cat_html": "commerce.html",
        "title_prefix": "דהרי — נדל״ן מסחרי",
        "portfolio_head": "נכסים מסחריים במיקומים שמזינים צמיחה.",
        "portfolio_aria": "פורטפוליו מסחרי",
    },
    "offices": {
        "prefix": "offices",
        "page_class": "dh-page-property-item",
        "cat_he": "פרוייקטים בהקמה",
        "cat_html": "offices.html",
        "title_prefix": "דהרי — פרוייקטים בהקמה",
        "portfolio_head": "פרויקטים חדשים בהקמה — פרטים נוספים בקרוב.",
        "portfolio_aria": "פורטפוליו פרוייקטים בהקמה",
    },
    "residences": {
        "prefix": "residences",
        "page_class": "dh-page-property-item",
        "cat_he": "מגורים",
        "cat_html": "residences.html",
        "title_prefix": "דהרי — מגורים",
        "portfolio_head": "פרויקטי מגורים באיכות גבוהה ובמיקומים מבוקשים.",
        "portfolio_aria": "פורטפוליו מגורים",
    },
}


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
    s = str(s).replace("\xa0", " ").strip()
    s = re.sub(r"[ \t]+", " ", s)
    return s


def first_line(s):
    s = clean_text(s)
    if not s:
        return ""
    return s.split("\n")[0].strip()


def body_text(long_desc, short_desc):
    """Plain-text fallback (legacy)."""
    long_desc = (long_desc or "").strip()
    short_desc = clean_text(short_desc)
    if long_desc:
        return long_desc.replace("\n\n", " ").replace("\n", " ")
    return short_desc


def lines_to_html(text):
    """Escape text and preserve line breaks for display in a single block."""
    text = clean_text(text) if not text else str(text).replace("\xa0", " ").strip()
    if not text:
        return ""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if len(lines) <= 1:
        return html.escape(text)
    return "<br/>".join(html.escape(line) for line in lines)


def format_card_desc(short_desc, fallback=""):
    """Portfolio card copy from תיאור קצר."""
    text = (short_desc or "").strip() or clean_text(fallback)
    return lines_to_html(text)


def format_body_html(long_desc, short_desc=""):
    """Product page body from full תיאור ארוך."""
    text = (long_desc or "").strip()
    if not text:
        text = clean_text(short_desc)
    if not text:
        return '<p class="dh-logistics-item__body"></p>'
    parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not parts:
        parts = [text]
    blocks = []
    for part in parts:
        inner = lines_to_html(part)
        blocks.append(f'<p class="dh-logistics-item__body">{inner}</p>')
    return "\n".join(blocks)


def area_text(built, area):
    """Combined label for portfolio card tags."""
    built = clean_text(built)
    area = clean_text(area)
    if built and area and built != area:
        return f"{built} · {area}"
    return built or area or "—"


def meta_area_rows(built, plot_area):
    """Separate שטח בנוי / גודל שטח rows for product pages."""
    built_val = clean_text(built) or "—"
    plot_val = clean_text(plot_area) or "—"
    return (
        f'<div class="dh-logistics-item__meta-row" role="listitem">'
        f'<span class="dh-logistics-item__meta-label">שטח בנוי</span>'
        f"<span>{html.escape(built_val)}</span></div>\n"
        f'<div class="dh-logistics-item__meta-row" role="listitem">'
        f'<span class="dh-logistics-item__meta-label">גודל שטח</span>'
        f"<span>{html.escape(plot_val)}</span></div>\n"
    )


def display_title(address):
    address = clean_text(address)
    if address.startswith("דהרי"):
        address = re.sub(r"^דהרי\s*[–\-]?\s*", "", address).strip()
    return address


def is_latin_title(title):
    return bool(re.match(r"^[A-Za-z0-9][A-Za-z0-9\s\.\-&']*$", title))


def slug_part(text, max_len=40):
    text = clean_text(text).lower()
    text = text.replace("דהרי", "")
    latin = re.findall(r"[a-z0-9]+", text)
    if latin:
        return "-".join(latin)[:max_len].strip("-")
    hebrew = re.sub(r"[^\u0590-\u05FF\s]", "", text)
    hebrew = re.sub(r"\s+", "-", hebrew.strip())[:max_len].strip("-")
    return hebrew or "project"


def make_slug(section, idx, row):
    prefix = SECTION_META[section]["prefix"]
    addr = row["address"]
    short = first_line(row["short_desc"])
    detail = row["detail"]

    latin_addr = re.findall(r"[A-Za-z][A-Za-z0-9\s&.-]{1,30}", addr)
    nums = re.findall(r"\d+", addr)
    latin_short = re.findall(r"[A-Za-z][A-Za-z0-9\s-]{1,20}", short)
    latin_detail = re.findall(r"[A-Za-z][A-Za-z0-9\s-]{1,20}", detail)

    parts = []
    if latin_short:
        parts.append(slug_part(latin_short[0], 24))
    elif latin_addr:
        parts.append(slug_part(latin_addr[0], 24))
    elif nums:
        parts.append("-".join(nums[:2]))

    if latin_detail:
        parts.append(slug_part(latin_detail[0], 20))
    elif detail and not parts:
        parts.append(slug_part(detail, 24))
    elif short and not parts:
        parts.append(slug_part(short, 24))

    if not parts:
        parts.append(f"{idx:02d}")

    slug = "-".join(p for p in parts if p)[:56].strip("-")
    return f"{prefix}-item-{slug}"


def asset_href(rel_path):
    rel_path = str(rel_path).replace("\\", "/").lstrip("/")
    return "/".join(quote(part, safe="") for part in rel_path.split("/"))


def _natural_sort_key(path):
    name = path.name.lower()
    parts = re.split(r"(\d+)", name)
    return [int(p) if p.isdigit() else p for p in parts]


VIDEO_DIR_HINTS = ("וידאו", "video")
MAX_GALLERY = 7

# Fallback render sets (used only to enrich a project that has too few real photos)
SECTION_GENERIC = {
    "commerce": ["Commerce/המלאכה 30"],
    "offices": [
        "about/A2.png",
        "about/P2.png",
        "about/F2.png",
        "about/23.png",
        "about/living-building-1024x480.jpg",
    ],
    "residences": [
        "Residences/living-building-1024x480.jpg",
        "Residences/E2.png",
        "about/living-building-1024x480.jpg",
    ],
}


def _collect_from(rel):
    """Return image files under a RealEstate folder (recursive) or a single file.

    Curated top-level renders/photos come first (shallowest depth), drone
    "stills" in nested folders last; "small" variants are always last. Video
    folders are skipped.
    """
    base = REAL_ESTATE / rel
    if base.is_file():
        return [base] if base.suffix.lower() in IMAGE_EXT else []
    if not base.is_dir():
        return []

    items = []
    for p in base.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in IMAGE_EXT:
            continue
        if any(hint in part for part in p.parts for hint in VIDEO_DIR_HINTS):
            continue
        depth = len(p.relative_to(base).parts) - 1
        items.append((depth, p))

    def sort_key(item):
        depth, path = item
        is_small = 1 if "small" in path.stem.lower() else 0
        return (is_small, depth, _natural_sort_key(path))

    items.sort(key=sort_key)
    return [p for _, p in items]


def _match_text(*parts):
    return clean_text(" ".join(p for p in parts if p)).lower()


def project_image_candidates(section, address, floor, head):
    """Ordered list of RealEstate folders/files for a project, matched by
    use → address → property/business → floor (mirrors the asset tree).

    `head` is title + detail only (NOT the long description, which routinely
    name-drops neighbouring businesses like "קפולסקי" and would mismatch).
    """
    addr = address or ""
    floor = floor or ""
    cands = []

    def add(*parts):
        rel = "/".join(parts)
        if rel not in cands:
            cands.append(rel)

    # ---- Residential projects (section-gated: some addresses contain
    #      strings like "בית ליד" that would otherwise hit office plots) ----
    if section == "residences":
        if "בר אילן" in addr or "בר-אילן" in addr.replace(" ", ""):
            add("Residences", "בר אילן 31 נתניה")
        elif "שפיר" in addr:
            add("Residences/משה-שפירא-1024x576.jpg")
        return cands

    # ---- Projects under construction / land plots ----
    if section == "offices":
        if "בית ליד" in addr or "כפר יונה" in addr:
            add("Inprogress", "בית ליד")
        elif "דגניה" in addr or "יהלום" in addr:
            add("Logistic", "דגניה, אזור תעשייה קריית יהלום")
        return cands

    # ---- Commercial properties, by address → business/property → floor ----
    if "המלאכה 30" in addr:
        if any(k in head for k in ("פטיסר", "קפולסק", "קפה")):
            add("Commerce", "המלאכה 30", "Kapulsky")
        elif any(k in head for k in ("תינוק", "baby")):
            add("Commerce", "המלאכה 30", "Baby star")
        elif any(k in head for k in ("אופטיק", "alpina", "עדש")):
            add("Commerce", "המלאכה 30", "Alpina")
            add("Offices", "המלאכה 30", "Addon optics")
        elif any(k in head for k in ("ריהוט", "עיצוב", "נוי", "צמח")):
            add("Commerce", "המלאכה 30", "Kado home")
        elif "תאור" in head:
            add("Commerce", "המלאכה 30", "לוטוס")
        elif any(k in head for k in ("אבטח", "ניטור", "הייטק", "מעבד", "פיתוח", "sne")):
            add("Offices", "המלאכה 30", "Neuralgourd")
        add("Commerce", "המלאכה 30")
    elif "התרופה 4" in addr:
        if "קרקע" in floor or any(k in head for k in ("wolt", "וולט", "סופר")):
            add("Commerce", "התרופה 4", "wolt market", "התרופה 4 קרקע")
            add("Commerce", "התרופה 4", "wolt market")
        elif "קומה ב" in floor or any(k in head for k in ("ייצור", "הרכבה", "מדפס", "תלת")):
            add("Offices", "התרופה 4", "סינרגי", "התרופה 4 קומה ב")
            add("Offices", "התרופה 4", "סינרגי")
        elif "קומה א" in floor or any(k in head for k in ("ישיב", "תצוג", "משרד")):
            add("Offices", "התרופה 4", "פולוסוויס", "התרופה 4 קומה א")
            add("Offices", "התרופה 4", "פולוסוויס")
        add("Offices", "התרופה 4")
    elif "המלאכה 15" in addr:
        if "משרד" in head or "קומה א" in floor:
            add("Offices", "המלאכה 15")
            add("Commerce", "המלאכה 15", "מלאכה 15")
        else:
            add("Commerce", "המלאכה 15", "SNE", "המלאכה 15 אולם תצוגה קרקע")
            add("Commerce", "המלאכה 15", "מלאכה 15")
        add("Commerce", "המלאכה 15")
    elif "המלאכה 4" in addr:
        add("Commerce", "המלאכה 4", "המלאכה 4 א.ת פולג נתניה")
        add("Commerce", "המלאכה 4", "אלבר")
        add("Commerce", "המלאכה 4")

    return cands


def resolve_project_images(section, row, title):
    address = clean_text(row.get("address"))
    floor = clean_text(row.get("floor"))
    head = _match_text(title, row.get("detail"))

    collected = []
    seen = set()

    def take(rels, limit):
        for rel in rels:
            for path in _collect_from(rel):
                key = path.resolve()
                if key in seen:
                    continue
                seen.add(key)
                collected.append(path)
                if len(collected) >= limit:
                    return

    take(project_image_candidates(section, address, floor, head), MAX_GALLERY)
    if len(collected) < 4:
        take(SECTION_GENERIC.get(section, []), MAX_GALLERY)

    hrefs = [asset_href(p.relative_to(ROOT).as_posix()) for p in collected[:MAX_GALLERY]]
    return hrefs or [GREY_PLACEHOLDER]


def img_class(src):
    return "dh-img-placeholder" if src == GREY_PLACEHOLDER else ""


def project_title(row):
    short = first_line(row["short_desc"])
    if short and len(short) >= 4:
        return short[:120]
    detail = clean_text(row["detail"])
    if detail:
        return detail[:120]
    return display_title(row["address"]) or "פרויקט"


def row_has_content(row):
    return any(
        clean_text(row.get(k))
        for k in ("address", "detail", "short_desc", "long_desc", "built", "area")
    )


def parse_excel_rows(rows):
    projects = []
    section_counts = {}
    seen_slugs = set()

    for excel_row in rows[1:]:
        cat = clean_text(excel_row[0] if len(excel_row) > 0 else "")
        section = CATEGORY_MAP.get(cat)
        if not section:
            continue

        row = {
            "category": cat,
            "detail": clean_text(excel_row[1] if len(excel_row) > 1 else ""),
            "address": clean_text(excel_row[2] if len(excel_row) > 2 else ""),
            "floor": clean_text(excel_row[3] if len(excel_row) > 3 else ""),
            "built": excel_row[4] if len(excel_row) > 4 else "",
            "area": excel_row[5] if len(excel_row) > 5 else "",
            "long_desc": excel_row[6] if len(excel_row) > 6 else "",
            "short_desc": excel_row[7] if len(excel_row) > 7 else "",
        }
        if not row_has_content(row):
            continue

        section_counts[section] = section_counts.get(section, 0) + 1
        idx = section_counts[section]
        prefix = SECTION_META[section]["prefix"]

        base_slug = make_slug(section, idx, row).replace(".html", "")
        slug = base_slug
        if slug in seen_slugs:
            slug = f"{base_slug}-{idx:02d}"
        seen_slugs.add(slug)
        filename = f"{slug}.html"

        title = project_title(row)
        short_desc = (row["short_desc"] or "").strip()
        long_desc = (row["long_desc"] or "").strip()
        body_html = format_body_html(long_desc, short_desc)
        tagline = row["detail"] or first_line(short_desc) or title
        built = clean_text(row["built"])
        plot_area = clean_text(row["area"])
        card_area = area_text(row["built"], row["area"])
        images = resolve_project_images(section, row, title)

        projects.append(
            {
                "slug": slug.replace(".html", ""),
                "section": section,
                "title": title,
                "tagline": tagline,
                "short_desc": short_desc,
                "long_desc": long_desc,
                "body_html": body_html,
                "address": row["address"] or title,
                "built": built,
                "plot_area": plot_area,
                "area": card_area,
                "floor": row["floor"],
                "images": images,
                "filename": filename,
            }
        )

    return projects


def title_html(title):
    if is_latin_title(title):
        return f'<h2 class="dh-logistics-item__title"><span dir="ltr" lang="en">{html.escape(title)}</span></h2>'
    return f'<h2 class="dh-logistics-item__title">{html.escape(title)}</h2>'


def breadcrumb_current(title):
    if is_latin_title(title):
        return f'<span aria-current="page" class="dh-breadcrumbs__current"><span dir="ltr" lang="en">{html.escape(title)}</span></span>'
    return f'<span aria-current="page" class="dh-breadcrumbs__current">{html.escape(title)}</span>'


def build_inquiry_section(project, meta):
    title = html.escape(project["title"])
    tagline = html.escape(project.get("tagline", ""))
    address = html.escape(project["address"])
    category = html.escape(meta["cat_he"])
    filename = html.escape(project["filename"])
    built = html.escape(project.get("built", ""))
    plot_area = html.escape(project.get("plot_area", ""))
    floor = html.escape(project.get("floor", ""))
    mailto = html.escape(INQUIRY_MAILTO)
    return f"""<section aria-label="יצירת קשר לגבי הנכס" class="dh-logistics-item__inquiry">
<h3 class="dh-logistics-item__inquiry-title">מעוניינים בנכס?</h3>
<p class="dh-logistics-item__inquiry-hint">השאירו דוא״ל — נשלח אליכם פנייה עם פרטי הנכס הזה.</p>
<div aria-live="assertive" class="dh-logistics-item__inquiry-alert" hidden="" id="dh-item-inquiry-alert" role="alert" tabindex="-1"></div>
<form class="dh-logistics-item__inquiry-form" data-mailto="{mailto}" data-product-address="{address}" data-product-built="{built}" data-product-category="{category}" data-product-floor="{floor}" data-product-plot="{plot_area}" data-product-tagline="{tagline}" data-product-title="{title}" data-product-url="{filename}" id="dh-item-inquiry-form" lang="he" novalidate="">
<div class="dh-logistics-item__inquiry-inline">
<label class="dh-logistics-item__inquiry-label dh-sr-only" for="dh-item-inquiry-email">דוא״ל</label>
<input aria-label="דוא״ל" aria-required="true" autocomplete="email" class="dh-logistics-item__inquiry-input" dir="ltr" id="dh-item-inquiry-email" inputmode="email" name="email" placeholder="name@domain.co.il" required="" type="email"/>
<button class="dh-logistics-item__inquiry-submit" type="submit">שליחה</button>
</div>
</form>
</section>"""


def img_attrs_class(src, extra=""):
    cls = " ".join(part for part in [img_class(src), extra] if part)
    return f' class="{cls}"' if cls else ""


def build_item_page(project, all_in_section):
    meta = SECTION_META[project["section"]]
    title = project["title"]
    tagline = project["tagline"]
    body_html = project["body_html"]
    address = project["address"]
    built = project.get("built", "")
    plot_area = project.get("plot_area", "")
    images = project["images"]
    gallery_images = images[:7]

    related = [p for p in all_in_section if p["slug"] != project["slug"]][:5]
    also_like_html = []
    for r in related:
        card_label = r["address"]
        also_like_html.append(
            f"""<li role="listitem">
<a aria-label="מעבר לעמוד הפרויקט — {html.escape(card_label)}" class="dh-logistics-item__also-like-card" href="{html.escape(r['filename'])}">
<span class="dh-logistics-item__also-like-media">
<img alt=""{img_attrs_class(r['images'][0])} decoding="async" height="200" loading="lazy" referrerpolicy="no-referrer" src="{html.escape(r['images'][0])}" width="200"/>
</span>
<span class="dh-logistics-item__also-like-body">
<span class="dh-logistics-item__also-like-name">{html.escape(card_label)}</span>
</span>
</a>
</li>"""
        )

    gallery_li = "\n".join(
        f'<li role="listitem"><img alt=""{img_attrs_class(src)} decoding="async" height="600" loading="lazy" referrerpolicy="no-referrer" src="{html.escape(src)}" width="960"/></li>'
        for src in gallery_images
    )

    floor_row = ""
    if project.get("floor"):
        floor_row = f'<div class="dh-logistics-item__meta-row" role="listitem"><span class="dh-logistics-item__meta-label">קומה</span><span>{html.escape(project["floor"])}</span></div>\n'
    area_rows = meta_area_rows(built, plot_area)
    inquiry_html = build_inquiry_section(project, meta)

    page = f"""<!DOCTYPE html>

<html class="{meta['page_class']}" dir="rtl" lang="he">
<head>
<meta charset="utf-8"/>
<script src="dh-page-transition-boot.js?v=1"></script>
<meta content="width=device-width, initial-scale=1, viewport-fit=cover" name="viewport"/>
<title>{html.escape(meta['title_prefix'])} — {html.escape(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@500;600;700&amp;family=Rubik:wght@400;500;600;700&amp;display=swap" rel="stylesheet"/>
<link href="index-layout.css?v=73" rel="stylesheet"/>
<link href="dh-side-header888.css?v=70" rel="stylesheet"/>
<link href="dh-logistics-item.css?v=77" rel="stylesheet"/>
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
{breadcrumb_current(address)}
</p>
</nav>
<article class="dh-logistics-item" dir="rtl" lang="he">
<div class="dh-logistics-item__split">
<div class="dh-logistics-item__content-col">
<div class="dh-logistics-item__content-main">
{title_html(title)}
<p class="dh-logistics-item__tagline">{html.escape(tagline)}</p>
<div class="dh-logistics-item__details-split">
<div class="dh-logistics-item__description">
{body_html}
</div>
<div class="dh-logistics-item__meta-side">
<div class="dh-logistics-item__meta" role="list">
<div class="dh-logistics-item__meta-row" role="listitem"><span class="dh-logistics-item__meta-label">כתובת</span><span>{html.escape(address)}</span></div>
{floor_row}{area_rows}
</div>
{inquiry_html}
</div>
</div>
</div>
<section aria-label="אולי יעניין אותך גם" class="dh-logistics-item__also-like">
<h3 class="dh-logistics-item__also-like-title">
<span class="dh-logistics-item__also-like-title-he">אולי יעניין אותך גם</span>
<span class="dh-logistics-item__also-like-title-en" lang="he">נכסים נוספים באותה הכתובת</span>
</h3>
<ul class="dh-logistics-item__also-like-grid" role="list">
{"".join(also_like_html)}
</ul>
</section>
</div>
<div class="dh-logistics-item__media-col">
<div aria-label="גלריה" class="dh-logistics-item__gallery">
<ul class="dh-logistics-item__gallery-grid" role="list">
{gallery_li}
</ul>
</div>
</div>
</div>
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
<a class="dh-side-header888__menu-link888" href="offices.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">02</span>
<span class="dh-side-header888__menu-link-text888">פרוייקטים בהקמה</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Under construction</span>
</a>
<a class="dh-side-header888__menu-link888" href="residences.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">03</span>
<span class="dh-side-header888__menu-link-text888">מגורים</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Residences</span>
</a>
<a class="dh-side-header888__menu-link888" href="commerce.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">04</span>
<span class="dh-side-header888__menu-link-text888">נדל״ן מסחרי</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">Commercial</span>
</a>
<a class="dh-side-header888__menu-link888" href="about.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">05</span>
<span class="dh-side-header888__menu-link-text888">אודות</span>
<span class="dh-side-header888__menu-link-subtle888" lang="en">About</span>
</a>
<a class="dh-side-header888__menu-link888" href="contact.html">
<span aria-hidden="true" class="dh-side-header888__menu-link-index888">06</span>
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
<script defer="" src="dh-side-header888.js?v=15"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
<script defer="" src="dh-logistics-item.js?v=37"></script>
</div>
</body>
</html>
"""
    return project["filename"], page


def build_portfolio_slide(project, iframe=False):
    target = ' rel="noopener" target="_parent"' if iframe else ' rel="noopener"'
    desc = format_card_desc(project.get("short_desc", ""), project.get("long_desc", "") or project["title"])
    location = html.escape(project["address"])
    area = html.escape(project["area"])
    img = html.escape(project["images"][0])
    href = html.escape(project["filename"])
    title = html.escape(project["title"])
    corners = CORNER_SVG * 4
    return f"""<div class="swiper-slide wqf-slide">
<div class="wqf-slide-card" style="--hover-logo-color: #dadada;">
<div class="wqf-logo">
<img alt=""{img_attrs_class(project["images"][0], "wqf-logo-img")} decoding="async" height="540" loading="lazy" referrerpolicy="no-referrer" src="{img}" width="960"/>
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
    slides = "\n".join(build_portfolio_slide(p, iframe=iframe) for p in projects)
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
    if 'aria-label="פורטפוליו' in text or "portfolio_aria" in meta:
        text = re.sub(
            r'aria-label="[^"]*" class="wqf-section"',
            f'aria-label="{meta["portfolio_aria"]}" class="wqf-section"',
            text,
            count=1,
        )
    path.write_text(text, encoding="utf-8")


def main():
    if not XLSX.exists():
        raise SystemExit(f"Missing Excel file: {XLSX}")

    rows = read_xlsx(XLSX)
    built_projects = parse_excel_rows(rows)

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
            print("Wrote", fname)

    for section in ("commerce", "offices", "residences"):
        path = ROOT / f"{section}.html"
        items = by_section.get(section, [])
        if path.exists() and items:
            update_portfolio_file(path, section, items, iframe=False)
            print("Updated", path.name, f"({len(items)} slides)")

    print(f"\nDone: {len(built_projects)} project pages generated.")
    for section, items in by_section.items():
        print(f"  {section}: {len(items)}")


if __name__ == "__main__":
    main()
