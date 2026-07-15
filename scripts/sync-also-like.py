#!/usr/bin/env python3
"""Fill "אולי יעניין אותך גם" with 5 cards: same category first, then others."""

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts" / "build-projects-from-excel.py"

spec = importlib.util.spec_from_file_location("build_projects", BUILD)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

if __name__ == "__main__":
    count = build.sync_also_like_sections()
    print(f"\nSynced also-like on {count} product page(s).")
