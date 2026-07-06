# 简卡拉卡 Logo（Min-4 / Min-5）

仅保留两款简约 JK 字标，其余方案已移除。

| 文件 | 说明 | 用途 |
|------|------|------|
| `variants/logo-jk-min-v4.svg` | 线构 JK + 紫色 JIANKALKA | 备选 |
| `variants/logo-jk-min-v5.svg` | 分隔线增强（渐变线、绿能点） | **官网默认** |
| `logo-mark.svg` | 同 Min-5，80×88 | 竖版 |
| `logo-mark-square.svg` | 同 Min-5，64×64 | 顶栏 / favicon |
| `logo-mark.png` | 320px 宽 PNG | 分享、文档 |
| `logo-mark-square.png` | 256px 方 PNG | 同上 |
| `jiankalka-logo-mark.png` | 同方版 PNG | 兼容旧引用 |

重新导出 PNG：

```powershell
powershell -ExecutionPolicy Bypass -File website\scripts\export-brand-logo.ps1
```

官网 `index.html` 引用 `logo-mark-square.svg`；部署时上传 `images/brand/` 下 SVG 与 PNG。
