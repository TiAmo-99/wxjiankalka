# -*- coding: utf-8 -*-
import re
import urllib.error
import urllib.request

BASE = "https://www.jiankalka.cn"

paths = [
    "/",
    "/css/style.css",
    "/js/main.js",
    "/images/brand/logo-mark-square.svg",
    "/images/products/host-liquid-cool-cabinet.jpg",
    "/images/products/host-liquid-cool-cabinet.png",
    "/images/products/dc-240kw-truck.jpg",
    "/images/products/dc-240kw-truck.png",
]

for p in paths:
    url = BASE + p
    try:
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req, timeout=15) as r:
            cl = r.headers.get("Content-Length", "?")
            ct = r.headers.get("Content-Type", "?")
            print(f"OK  {r.status} {cl:>8} {ct[:40]:40} {p}")
    except urllib.error.HTTPError as e:
        print(f"ERR {e.code} {'':>8} {'':40} {p}")
    except Exception as e:
        print(f"FAIL {'':>8} {str(e)[:40]:40} {p}")

with urllib.request.urlopen(BASE + "/", timeout=15) as r:
    html = r.read().decode("utf-8", "replace")

print("\nHTML checks:")
for token in [
    "./css/style.css",
    "./js/main.js",
    "host-liquid-cool-cabinet.jpg",
    "host-liquid-cool-cabinet.png",
    "section-products",
    "hero-visual",
    "reveal",
]:
    print(f"  {token}: {token in html}")

imgs = re.findall(r'src="([^"]+)"', html)
print("\nimg/src refs:")
for s in imgs:
    if "images" in s or "brand" in s:
        print(" ", s)
