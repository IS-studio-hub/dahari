#!/usr/bin/env python3
"""Refresh product galleries from configured folders (no Excel required)."""

import argparse
import importlib.util
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "scripts" / "build-projects-from-excel.py"

spec = importlib.util.spec_from_file_location("build_projects", BUILD)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


def folder_mtime(rel_from_root):
    folder = ROOT / rel_from_root
    if not folder.is_dir():
        return 0.0
    mtimes = [
        p.stat().st_mtime
        for p in folder.iterdir()
        if p.is_file() and not p.name.startswith(".")
    ]
    return max(mtimes, default=folder.stat().st_mtime)


def folder_snapshots():
    return {
        rel: folder_mtime(rel) for rel in build.GALLERY_FOLDER_SOURCES.values()
    }


def watch_galleries(interval):
    last = folder_snapshots()
    print("Watching gallery folders (Ctrl+C to stop)...")
    while True:
        time.sleep(interval)
        current = folder_snapshots()
        if current != last:
            last = current
            print("\nFolder change detected — syncing galleries...")
            build.sync_contentstorage_galleries()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync product page galleries from folders.")
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Keep running and re-sync when gallery folders change.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=2.0,
        help="Seconds between folder checks in --watch mode (default: 2).",
    )
    args = parser.parse_args()

    if args.watch:
        watch_galleries(args.interval)
    else:
        count = build.sync_contentstorage_galleries()
        print(f"\nSynced {count} gallery folder source(s).")
