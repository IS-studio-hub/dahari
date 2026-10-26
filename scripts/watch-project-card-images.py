#!/usr/bin/env python3
"""Re-sync category cards and recommended cards whenever either HTML file changes."""

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYNC = Path(__file__).with_name("sync-project-card-images.py")


def snapshot():
    files = [ROOT / "commerce.html", ROOT / "offices.html"]
    files += list(ROOT.glob("commerce-item-*.html"))
    files += list(ROOT.glob("offices-item-*.html"))
    files += list(ROOT.glob("residences-item-*.html"))
    found = {}
    for path in files:
        if path.exists():
            found[str(path)] = path.stat().st_mtime_ns
    return found


def main():
    previous = snapshot()
    while True:
        time.sleep(2)
        current = snapshot()
        if current != previous:
            subprocess.run([sys.executable, str(SYNC)], check=False)
            previous = snapshot()


if __name__ == "__main__":
    main()
