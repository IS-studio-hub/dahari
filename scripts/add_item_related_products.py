#!/usr/bin/env python3
"""Append same-category related project cards before </article> on *-item-*.html pages."""
from __future__ import annotations

import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]

MARKER_END = """          </ul>
        </div>

      </article>"""

# (href, aria_suffix, title_inner_html, hero_thumb_src)
COMMERCE = [
    (
        "commerce-item-ramat-aviv-mall.html",
        "קניון רמת אביב",
        "קניון רמת אביב",
        "assets/placeholders/commerce-mall-interior.jpg",
    ),
    (
        "commerce-item-ayalon-retail.html",
        "איילון ריטייל",
        "איילון ריטייל",
        "assets/placeholders/commerce-strip-junction.jpg",
    ),
    (
        "commerce-item-netanya-herzl.html",
        "שדרות הרצל נתניה",
        "שדרות הרצל נתניה",
        "assets/placeholders/commerce-high-street.jpg",
    ),
    (
        "commerce-item-herzliya-local.html",
        "מרכז המכבים",
        "מרכז המכבים",
        "assets/placeholders/commerce-neighborhood-plaza.jpg",
    ),
]

OFFICES = [
    (
        "offices-item-azrieli-begin.html",
        "מגדלי עזריאלי בגין",
        "מגדלי עזריאלי בגין",
        "assets/placeholders/offices-campus-train.jpg",
    ),
    (
        "offices-item-herzliya-green.html",
        "הרצליה גרין קמפוס",
        "הרצליה גרין קמפוס",
        "assets/placeholders/offices-green-park.jpg",
    ),
    (
        "offices-item-haifa-tower.html",
        "מגדל חיפה יפו",
        "מגדל חיפה יפו",
        "assets/placeholders/offices-tower-sea.jpg",
    ),
    (
        "offices-item-bursa-shared.html",
        "בורסה וורקספייס",
        "בורסה וורקספייס",
        "assets/placeholders/offices-coworking.jpg",
    ),
]

RESIDENCES = [
    (
        "residences-item-neve-tzedek-boutique.html",
        "נווה צדק בוטיק",
        "נווה צדק בוטיק",
        "assets/placeholders/residences-boutique-market.jpg",
    ),
    (
        "residences-item-ramat-gan-park.html",
        "פארק רמה״ג",
        "פארק רמה״ג",
        "assets/placeholders/residences-family-gardens.jpg",
    ),
    (
        "residences-item-raanana-boulevard.html",
        "שדרות הנשיא",
        "שדרות הנשיא",
        "assets/placeholders/residences-courtyard-paths.jpg",
    ),
    (
        "residences-item-netanya-sea.html",
        "נתניה ליין",
        "נתניה ליין",
        "assets/placeholders/residences-sea-terraces.jpg",
    ),
]

LOGISTICS = [
    (
        "logistics-item-alpha-deal.html",
        "Alpha Deal",
        '<span lang="en" dir="ltr">Alpha Deal</span>',
        "assets/placeholders/logistics-rothschild-tower.jpg",
    ),
    (
        "logistics-item-edda.html",
        "Edda",
        '<span lang="en" dir="ltr">Edda</span>',
        "assets/placeholders/logistics-podcast-studio.jpg",
    ),
    (
        "logistics-item-novyra.html",
        "Novyra",
        '<span lang="en" dir="ltr">Novyra</span>',
        "assets/placeholders/logistics-biotech-lab.jpg",
    ),
    (
        "logistics-item-remix-labs.html",
        "Remix Labs",
        '<span lang="en" dir="ltr">Remix Labs</span>',
        "assets/placeholders/logistics-data-control.jpg",
    ),
    (
        "logistics-item-stratahub.html",
        "Stratahub",
        '<span lang="en" dir="ltr">Stratahub</span>',
        "assets/placeholders/logistics-data-server.jpg",
    ),
    (
        "logistics-item-us-autonomous-systems.html",
        "US Autonomous Systems",
        '<span lang="en" dir="ltr">US Autonomous Systems</span>',
        "assets/placeholders/logistics-warehouse-drone.jpg",
    ),
]

SECTION_TITLES = {
    "commerce": "עוד פרויקטים בנדל״ן המסחרי",
    "offices": "עוד פרויקטים במשרדים",
    "residences": "עוד פרויקטים במגורים",
    "logistics": "עוד פרויקטים בלוגיסטיקה",
}


def build_related_html(category: str, current_file: str) -> str:
    rows = {
        "commerce": COMMERCE,
        "offices": OFFICES,
        "residences": RESIDENCES,
        "logistics": LOGISTICS,
    }[category]
    title = SECTION_TITLES[category]
    lines = [
        "        <section",
        '          class="dh-logistics-item__related"',
        '          aria-labelledby="dh-related-products-heading"',
        "        >",
        f'          <h3 id="dh-related-products-heading" class="dh-logistics-item__related-title">{title}</h3>',
        '          <ul class="dh-logistics-item__related-grid" role="list">',
    ]
    for href, aria_name, name_html, thumb in rows:
        if href == current_file:
            continue
        aria = f"מעבר לעמוד הפרויקט — {aria_name}"
        lines.append('            <li role="listitem">')
        lines.append(
            f'              <a class="dh-logistics-item__related-card" href="{href}" aria-label="{aria}">'
        )
        lines.append('                <span class="dh-logistics-item__related-media">')
        lines.append(
            f'                  <img src="{thumb}" alt="" width="960" height="540" loading="lazy" decoding="async" referrerpolicy="no-referrer" />'
        )
        lines.append("                </span>")
        lines.append(
            f'                <span class="dh-logistics-item__related-name">{name_html}</span>'
        )
        lines.append("              </a>")
        lines.append("            </li>")
    lines.append("          </ul>")
    lines.append("        </section>")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    for path in sorted(ROOT.glob("*-item-*.html")):
        name = path.name
        if "dh-logistics-item__related" in path.read_text(encoding="utf-8"):
            print(f"[skip] {name} (already has related block)")
            continue
        if name.startswith("commerce-item-"):
            cat = "commerce"
        elif name.startswith("offices-item-"):
            cat = "offices"
        elif name.startswith("residences-item-"):
            cat = "residences"
        elif name.startswith("logistics-item-"):
            cat = "logistics"
        else:
            print(f"[skip] {name} (unknown prefix)")
            continue
        block = build_related_html(cat, name)
        text = path.read_text(encoding="utf-8")
        if MARKER_END not in text:
            print(f"[err] {name}: gallery end marker not found")
            continue
        insertion = (
            """          </ul>
        </div>
"""
            + block
            + """      </article>"""
        )
        text = text.replace(MARKER_END, insertion, 1)
        path.write_text(text, encoding="utf-8")
        print(f"[ok] {name}")


if __name__ == "__main__":
    main()
