"""
从 Icons8 下载 Tab 图标（iOS 线型风格），着色后输出 81×81 PNG。

计划 = 清单剪贴板 | 今日 = 日历今日 | 我的 = 用户头像

运行: pip install pillow && python miniapp/scripts/download-tab-icons.py

图标来源: https://icons8.com （免费使用需保留出处说明）
"""
import os
import urllib.request

from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', 'static', 'tab')
SIZE = 81

URLS = {
    'plan.png': 'https://img.icons8.com/ios/100/clipboard.png',
    'plan-active.png': 'https://img.icons8.com/ios-filled/100/clipboard.png',
    'report.png': 'https://img.icons8.com/ios/100/today.png',
    'report-active.png': 'https://img.icons8.com/ios-filled/100/today.png',
    'mine.png': 'https://img.icons8.com/ios/100/user-male-circle--v1.png',
    'mine-active.png': 'https://img.icons8.com/ios-filled/100/user-male-circle--v1.png',
}


def tint(img, hex_color):
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    img = img.convert('RGBA')
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    px = img.load()
    op = out.load()
    for y in range(img.height):
        for x in range(img.width):
            a = px[x, y][3]
            if a < 16:
                continue
            lum = max(px[x, y][:3])
            if lum > 245:
                continue
            op[x, y] = (r, g, b, a)
    return out


def main():
    os.makedirs(ROOT, exist_ok=True)
    for name, url in URLS.items():
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=30).read()
        path = os.path.join(ROOT, name)
        tmp = path + '.tmp'
        with open(tmp, 'wb') as f:
            f.write(data)
        im = Image.open(tmp).convert('RGBA')
        os.remove(tmp)
        color = '4f6ef7' if 'active' in name else '8a94a6'
        im = tint(im, color)
        im.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(path, 'PNG')
        print('wrote', name)
    print('done ->', ROOT)


if __name__ == '__main__':
    main()
