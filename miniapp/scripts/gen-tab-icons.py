"""生成 TabBar 图标 81x81 PNG。运行: python miniapp/scripts/gen-tab-icons.py"""
import math
import os
import struct
import zlib

ROOT = os.path.join(os.path.dirname(__file__), '..', 'static', 'tab')
W = H = 81


def write_png(path, draw):
    rows = []
    for y in range(H):
        row = b'\x00'
        for x in range(W):
            r, g, b, a = draw(x, y)
            row += bytes([r, g, b, a])
        rows.append(row)
    raw = b''.join(rows)
    comp = zlib.compress(raw, 9)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', comp) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def lerp(a, b, t):
    return int(a + (b - a) * t)


def calendar(x, y, active):
    cx, cy = 40.5, 40.5
    dx, dy = x - cx, y - cy
    if active:
        if dx * dx + dy * dy <= 36 * 36:
            t = 0.5 + 0.5 * math.sin(math.atan2(dy, dx) * 3)
            return lerp(79, 107, t), lerp(110, 76, t), lerp(247, 230, t), 255
        return 255, 255, 255, 0
    if dx * dx + dy * dy <= 34 * 34:
        return 156, 163, 175, 255
    return 255, 255, 255, 0


def sun(x, y, active):
    cx, cy = 40.5, 40.5
    dx, dy = x - cx, y - cy
    d = math.hypot(dx, dy)
    if active:
        if d <= 28:
            return 107, 76, 230, 255
        if 30 <= d <= 36 and int(math.atan2(dy, dx) * 8 / math.pi) % 2 == 0:
            return 79, 110, 247, 255
        return 255, 255, 255, 0
    if d <= 26:
        return 156, 163, 175, 255
    if 28 <= d <= 34 and int(math.atan2(dy, dx) * 8 / math.pi) % 2 == 0:
        return 180, 186, 198, 255
    return 255, 255, 255, 0


def user(x, y, active):
    cx, cy = 40.5, 40.5
    dx, dy = x - cx, y - cy
    col = (107, 76, 230) if active else (156, 163, 175)
    head = math.hypot(dx, dy - 10) <= 14
    body = abs(dx) <= 22 and 18 <= dy - cy <= 34
    if head or body:
        return col[0], col[1], col[2], 255
    return 255, 255, 255, 0


def main():
    os.makedirs(ROOT, exist_ok=True)
    pairs = [
        ('plan.png', lambda x, y: calendar(x, y, False)),
        ('plan-active.png', lambda x, y: calendar(x, y, True)),
        ('report.png', lambda x, y: sun(x, y, False)),
        ('report-active.png', lambda x, y: sun(x, y, True)),
        ('mine.png', lambda x, y: user(x, y, False)),
        ('mine-active.png', lambda x, y: user(x, y, True)),
    ]
    for name, fn in pairs:
        write_png(os.path.join(ROOT, name), fn)
        print('wrote', name)


if __name__ == '__main__':
    main()
