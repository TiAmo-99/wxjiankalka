# -*- coding: utf-8 -*-
"""Compress product PNG/JPG for web upload (recommended before deploy).

Run from repo root:
  python website/scripts/compress-product-images.py

Writes optimized files in website/static-test/images/products/.
Large PNGs (>0.5MB) are saved as JPEG; originals removed when safe.
"""
from __future__ import annotations

import os
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DST = REPO / "website" / "static-test" / "images" / "products"
MAX_SIDE = 1600
JPEG_QUALITY = 82

try:
    from PIL import Image
except ImportError:
    print("请先安装: pip install Pillow")
    raise SystemExit(1)


def compress_file(path: Path) -> None:
    if path.suffix.lower() == ".bak" or path.name.endswith(".png.bak"):
        return

    orig_mb = path.stat().st_size / (1024 * 1024)
    if orig_mb < 0.35 and path.suffix.lower() in (".jpg", ".jpeg", ".webp"):
        print(f"  skip (already small) {path.name} ({orig_mb:.2f} MB)")
        return

    img = Image.open(path)
    if img.mode in ("RGBA", "P"):
        bg = Image.new("RGB", img.size, (15, 23, 42))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode == "RGBA":
            bg.paste(img, mask=img.split()[3])
        else:
            bg.paste(img)
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)

    use_jpeg = path.suffix.lower() == ".png"
    out = path.with_suffix(".jpg") if use_jpeg else path
    tmp = out.with_suffix(out.suffix + ".tmp")

    save_kw = {"quality": JPEG_QUALITY, "optimize": True}
    if out.suffix.lower() in (".jpg", ".jpeg") or use_jpeg:
        img.save(tmp, "JPEG", **save_kw)
    else:
        img.save(tmp, "PNG", optimize=True)

    try:
        os.replace(tmp, out)
    except OSError:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
        raise

    if out != path and path.exists():
        try:
            path.unlink()
        except OSError as e:
            print(f"  WARN 无法删除原图 {path.name}（可能被占用）: {e}")

    for bak in (path.with_suffix(path.suffix + ".bak"), path.parent / (path.name + ".bak")):
        if bak.exists():
            try:
                bak.unlink()
            except OSError:
                pass

    new_mb = out.stat().st_size / (1024 * 1024)
    print(f"  OK  {out.name}: {orig_mb:.2f} MB -> {new_mb:.2f} MB")


def main() -> None:
    if not DST.is_dir():
        print("未找到:", DST)
        raise SystemExit(1)

    print("压缩目录:", DST)
    for f in sorted(DST.iterdir()):
        if f.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        if f.suffix.lower() == ".png":
            jpg = f.with_suffix(".jpg")
            if jpg.exists() and jpg.stat().st_mtime >= f.stat().st_mtime:
                continue
        compress_file(f)

    print("\n完成后请重新上传 images/products/，并确认 index.html 引用 .jpg 路径。")


if __name__ == "__main__":
    main()
