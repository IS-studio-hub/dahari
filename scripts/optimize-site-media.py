#!/usr/bin/env python3
"""Optimize images/videos referenced by the site; remove originals.

Images → WebP (max 1600px). Videos → H.264 MP4 (max 720p, faststart).
Updates HTML/CSS/JS/manifest JSON references, then deletes originals.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXTS = {".mp4", ".mov"}
SKIP_EXTS = {".svg"}
MAX_IMAGE_EDGE = 1600
WEBP_QUALITY = 78
VIDEO_HEIGHT = 720
VIDEO_CRF = 28


def enc_path(rel: str) -> str:
    return "/".join(urllib.parse.quote(part, safe="") for part in rel.split("/"))


def collect_used() -> set[str]:
    media_re = re.compile(
        r"""(?P<q>["'(])(?P<path>(?:assets|\./assets|/assets)[^"'()\s>]+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|mov|MP4|MOV|JPG|JPEG|PNG|WEBP))(?P=q)""",
        re.I,
    )
    url_re = re.compile(
        r"""url\(\s*['"]?(?P<path>(?:assets|\./assets)[^'")\s]+\.(?:jpg|jpeg|png|webp|gif|svg|mp4|mov))['"]?\s*\)""",
        re.I,
    )
    used: set[str] = set()

    for pattern in ("*.html", "*.css", "*.js"):
        for f in ROOT.glob(pattern):
            text = f.read_text(encoding="utf-8", errors="ignore")
            for m in media_re.finditer(text):
                used.add(urllib.parse.unquote(m.group("path").lstrip("./").lstrip("/")))
            for m in url_re.finditer(text):
                used.add(urllib.parse.unquote(m.group("path").lstrip("./").lstrip("/")))

    for manifest in (ROOT / "assets").rglob("manifest.json"):
        data = json.loads(manifest.read_text(encoding="utf-8"))
        for key in ("images", "media"):
            for item in data.get(key) or []:
                src = item if isinstance(item, str) else item.get("src")
                if not src:
                    continue
                used.add(urllib.parse.unquote(src))

    return {p for p in used if (ROOT / p).is_file()}


def optimize_image(src: Path, dest: Path) -> None:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        if max(im.size) > MAX_IMAGE_EDGE:
            im.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.Resampling.LANCZOS)
        if im.mode == "RGBA":
            # Keep transparency only when needed; flatten soft photos to RGB.
            alpha = im.getchannel("A")
            if alpha.getextrema()[0] >= 250:
                im = im.convert("RGB")
        dest.parent.mkdir(parents=True, exist_ok=True)
        save_kwargs = {"quality": WEBP_QUALITY, "method": 6}
        if im.mode == "RGB":
            save_kwargs["optimize"] = True
        im.save(dest, "WEBP", **save_kwargs)


def optimize_video(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp.mp4")
    if tmp.exists():
        tmp.unlink()
    size = src.stat().st_size
    # More aggressive for huge drone files so pages stay mobile-friendly.
    if size > 80 * 1024 * 1024:
        height, crf, audio = 540, 32, "64k"
    elif size > 20 * 1024 * 1024:
        height, crf, audio = 720, 30, "96k"
    else:
        height, crf, audio = VIDEO_HEIGHT, VIDEO_CRF, "96k"
    vf = f"scale=-2:'min({height},ih)'"
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(src),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        str(crf),
        "-c:a",
        "aac",
        "-b:a",
        audio,
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        "-pix_fmt",
        "yuv420p",
        str(tmp),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    tmp.replace(dest)


def replace_in_text(text: str, old_rel: str, new_rel: str) -> str:
    variants = {
        old_rel,
        enc_path(old_rel),
        old_rel.replace(" ", "%20"),
    }
    # Case variants for extension
    stem, _, ext = old_rel.rpartition(".")
    if ext:
        for e in {ext, ext.lower(), ext.upper(), ext.capitalize()}:
            variants.add(f"{stem}.{e}")
            variants.add(enc_path(f"{stem}.{e}"))
    new_enc = enc_path(new_rel)
    for old in sorted(variants, key=len, reverse=True):
        if not old:
            continue
        if old in text:
            # Prefer matching encoded→encoded
            if "%" in old:
                text = text.replace(old, new_enc)
            else:
                text = text.replace(old, new_rel)
                text = text.replace(enc_path(old), new_enc)
    return text


def rewrite_site_files(replacements: list[tuple[str, str]]) -> None:
    targets = list(ROOT.glob("*.html")) + list(ROOT.glob("*.css")) + list(ROOT.glob("*.js"))
    targets += list((ROOT / "assets").rglob("manifest.json"))
    for path in targets:
        original = path.read_text(encoding="utf-8", errors="ignore")
        updated = original
        for old_rel, new_rel in replacements:
            updated = replace_in_text(updated, old_rel, new_rel)
        if updated != original:
            path.write_text(updated, encoding="utf-8")


def rewrite_manifests_only(replacements: dict[str, str]) -> None:
    """Rebuild image/video entries if paths changed; drop missing files."""
    for manifest in (ROOT / "assets").rglob("manifest.json"):
        data = json.loads(manifest.read_text(encoding="utf-8"))
        changed = False

        def map_src(src: str) -> str | None:
            nonlocal changed
            dec = urllib.parse.unquote(src)
            new_dec = replacements.get(dec, dec)
            if not (ROOT / new_dec).is_file():
                changed = True
                return None
            new_enc = enc_path(new_dec)
            if new_enc != src:
                changed = True
            return new_enc

        if isinstance(data.get("images"), list):
            new_images = []
            for src in data["images"]:
                mapped = map_src(src)
                if mapped:
                    new_images.append(mapped)
            if new_images != data["images"]:
                data["images"] = new_images
                changed = True

        if isinstance(data.get("media"), list):
            new_media = []
            for item in data["media"]:
                if not isinstance(item, dict) or "src" not in item:
                    continue
                mapped = map_src(item["src"])
                if not mapped:
                    continue
                item = dict(item)
                item["src"] = mapped
                # normalize video type if extension changed
                ext = Path(urllib.parse.unquote(mapped)).suffix.lower()
                if ext in VIDEO_EXTS | {".mp4"}:
                    item["type"] = "video"
                elif ext in IMAGE_EXTS | {".webp"}:
                    item["type"] = "image"
                new_media.append(item)
            data["media"] = new_media
            changed = True

        if changed:
            manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--images-only", action="store_true")
    parser.add_argument("--videos-only", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    used = sorted(collect_used())
    print(f"Found {len(used)} used media files")

    replacements: list[tuple[str, str]] = []
    to_delete: list[Path] = []

    work_images = not args.videos_only
    work_videos = not args.images_only

    if work_images:
        images = [u for u in used if Path(u).suffix.lower() in IMAGE_EXTS]
        print(f"Optimizing {len(images)} images → WebP…")
        for i, rel in enumerate(images, 1):
            src = ROOT / rel
            if src.suffix.lower() == ".webp" and src.stat().st_size < 400_000:
                print(f"  [{i}/{len(images)}] skip small webp {rel}")
                continue
            dest_rel = str(Path(rel).with_suffix(".webp"))
            dest = ROOT / dest_rel
            before = src.stat().st_size
            if args.dry_run:
                print(f"  [{i}/{len(images)}] would convert {rel} ({before/1e6:.1f}MB)")
                continue
            try:
                # Write to temp then replace to avoid partial files
                with tempfile.NamedTemporaryFile(suffix=".webp", delete=False) as tmp:
                    tmp_path = Path(tmp.name)
                optimize_image(src, tmp_path)
                after = tmp_path.stat().st_size
                if dest.resolve() != src.resolve():
                    shutil.move(str(tmp_path), dest)
                    to_delete.append(src)
                else:
                    tmp_path.replace(dest)
                replacements.append((rel, dest_rel))
                print(
                    f"  [{i}/{len(images)}] {rel}: {before/1e6:.1f}MB → {after/1e6:.1f}MB"
                )
            except Exception as exc:
                print(f"  [{i}/{len(images)}] FAIL {rel}: {exc}", file=sys.stderr)
                if "tmp_path" in locals() and tmp_path.exists():
                    tmp_path.unlink(missing_ok=True)

    if work_videos:
        videos = [u for u in used if Path(u).suffix.lower() in VIDEO_EXTS]
        print(f"Optimizing {len(videos)} videos → MP4 720p…")
        for i, rel in enumerate(videos, 1):
            src = ROOT / rel
            dest_rel = str(Path(rel).with_suffix(".mp4"))
            dest = ROOT / dest_rel
            before = src.stat().st_size
            # Skip if already small and mp4
            if (
                src.suffix.lower() == ".mp4"
                and before < 4_000_000
                and src.resolve() == dest.resolve()
            ):
                print(f"  [{i}/{len(videos)}] skip small {rel}")
                continue
            if args.dry_run:
                print(f"  [{i}/{len(videos)}] would encode {rel} ({before/1e6:.1f}MB)")
                continue
            try:
                # Encode to sibling temp path
                out_tmp = dest.with_name(dest.stem + ".__opt__.mp4")
                optimize_video(src, out_tmp)
                after = out_tmp.stat().st_size
                if after >= before * 0.98 and src.suffix.lower() == ".mp4":
                    # No meaningful gain — keep original
                    out_tmp.unlink(missing_ok=True)
                    print(f"  [{i}/{len(videos)}] keep original {rel} (no gain)")
                    continue
                # On case-insensitive FS, .MP4 and .mp4 are the same path.
                same_path = src.resolve() == dest.resolve() or src.name.lower() == dest.name.lower() and src.parent.resolve() == dest.parent.resolve()
                if same_path:
                    # Replace atomically via a differently named final file then rename.
                    final = dest.with_name(dest.stem + ".__final__.mp4")
                    if final.exists():
                        final.unlink()
                    out_tmp.replace(final)
                    src.unlink(missing_ok=True)
                    final.replace(dest)
                    if Path(rel).suffix != ".mp4":
                        replacements.append((rel, dest_rel))
                else:
                    if dest.exists():
                        dest.unlink()
                    out_tmp.replace(dest)
                    to_delete.append(src)
                    replacements.append((rel, dest_rel))
                print(
                    f"  [{i}/{len(videos)}] {rel}: {before/1e6:.1f}MB → {after/1e6:.1f}MB"
                )
            except subprocess.CalledProcessError as exc:
                err = (exc.stderr or b"").decode("utf-8", "ignore")[-400:]
                print(f"  [{i}/{len(videos)}] FAIL {rel}: {err}", file=sys.stderr)
            except Exception as exc:
                print(f"  [{i}/{len(videos)}] FAIL {rel}: {exc}", file=sys.stderr)

    if args.dry_run:
        return 0

    print(f"Rewriting references ({len(replacements)} path changes)…")
    rewrite_site_files(replacements)
    rewrite_manifests_only({a: b for a, b in replacements})

    # Re-sync image lists in manifests from folders (optimized webp/mp4 only)
    print("Cleaning manifests toward optimized media only…")
    for manifest in (ROOT / "assets").rglob("manifest.json"):
        folder = manifest.parent
        media = []
        images = []
        for f in sorted(folder.iterdir(), key=lambda p: p.name.lower()):
            if not f.is_file() or f.name.startswith(".") or f.name == "manifest.json":
                continue
            if f.name.endswith(".__opt__.mp4"):
                continue
            ext = f.suffix.lower()
            rel = str(f.relative_to(ROOT))
            src = enc_path(rel)
            if ext in {".webp", ".jpg", ".jpeg", ".png"}:
                images.append(src)
                media.append({"type": "image", "src": src})
            elif ext in {".mp4", ".mov"}:
                # Prefer mp4; skip leftover mov if mp4 exists
                if ext == ".mov" and f.with_suffix(".mp4").exists():
                    continue
                media.append({"type": "video", "src": src})
        # Videos first was slow — prefer images first for perceived performance
        media_sorted = [m for m in media if m["type"] == "image"] + [
            m for m in media if m["type"] == "video"
        ]
        payload = {"images": images, "media": media_sorted}
        manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Deleting {len(to_delete)} originals…")
    for path in to_delete:
        try:
            if path.exists():
                path.unlink()
                print(f"  deleted {path.relative_to(ROOT)}")
        except OSError as exc:
            print(f"  could not delete {path}: {exc}", file=sys.stderr)

    # Remove leftover __opt__ files
    for junk in ROOT.rglob("*.__opt__.mp4"):
        junk.unlink(missing_ok=True)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
