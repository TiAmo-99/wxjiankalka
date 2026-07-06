# -*- coding: utf-8 -*-
"""Copy product images to website/static-test/images/products/

Run from repo root:
  python website/scripts/copy-product-images.py
  python website/scripts/copy-product-images.py "D:\\path\\to\\产品图片"
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PARENT = REPO_ROOT.parent
DST = REPO_ROOT / "website" / "static-test" / "images" / "products"

MAPS = [
    ("9-交流桩/7kW个人有序交流充电桩-E3.jpg", "ac-7kw-e3.jpg"),
    ("1-社会版-一体机2025/1-120-180kW一体机/中性一体机---正面.jpg", "dc-120-180kw.jpg"),
    (
        "1-社会版-一体机2025/2-240kW-400kW重卡充电桩/"
        "lQLPJw8vB1eu1QXNDaXNE4iwbpN1EwDYUgwJlc0ZUfgoAQ_5000_3493.png",
        "dc-240kw-truck.png",
    ),
    ("7-全液冷主机柜/全液冷光储充放主机柜---.png", "host-liquid-cool-cabinet.png"),
    ("2-社会版-四种充电终端/1-液冷充电终端-正面.png", "terminal-liquid-cool.png"),
    ("3-小功率直流桩/小直流.png", "dc-small-power.png"),
    ("储充一体机效果图.png", "storage-charge-unit.png"),
    ("8-欧标直流桩/欧标直流桩.png", "eu-standard-dc.png"),
]


def find_source(explicit: str | None) -> Path | None:
    if explicit:
        p = Path(explicit).expanduser().resolve()
        return p if p.is_dir() else None

    candidates = [
        REPO_ROOT / "产品图片",
        REPO_ROOT / "2026_06_04_3-小功率直流桩",
        PARENT / "产品图片",
        PARENT / "2026_06_04_3-小功率直流桩",
    ]
    for c in candidates:
        if c.is_dir():
            return c
    return None


def main() -> None:
    explicit = sys.argv[1] if len(sys.argv) > 1 else None
    src_root = find_source(explicit)

    if not src_root:
        print("未找到产品图片目录，已尝试：")
        print(" ", REPO_ROOT / "产品图片")
        print(" ", REPO_ROOT / "2026_06_04_3-小功率直流桩")
        print(" ", PARENT / "产品图片")
        print("\n请将文件夹放在仓库根目录「产品图片」，或指定路径：")
        print('  python website/scripts/copy-product-images.py "D:\\路径\\产品图片"')
        raise SystemExit(1)

    print("图片来源:", src_root)
    DST.mkdir(parents=True, exist_ok=True)

    ok = 0
    for rel, name in MAPS:
        src = src_root / rel
        dst = DST / name
        if src.is_file():
            shutil.copy2(src, dst)
            print("  OK ", name)
            ok += 1
        else:
            print("  SKIP", rel)

    print(f"\n已复制 {ok}/{len(MAPS)} -> {DST}")
    print("请上传 static-test 到服务器。")


if __name__ == "__main__":
    main()
