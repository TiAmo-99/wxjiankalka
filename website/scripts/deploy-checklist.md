# www.jiankalka.cn 部署检查清单

## 上传前（本地）

```bat
python website\scripts\compress-product-images.py
```

确认 `website/static-test/images/products/` 以 `.jpg` 为主，单张一般 &lt; 500KB。

## 上传

将 **整个** `website/static-test/` 覆盖到服务器站点根目录（不要只传 `index.html`）。

必含目录：`css/`、`js/`、`images/`、`manage/`。

## 上传后（服务器）

可删除多余旧图（可选，减小误用与占用）：

- `images/products/*.png`（若已有对应 `.jpg`）
- `images/products/*.png.bak`

## 验证

```bat
python website\scripts\check-live-site.py
```

或浏览器 F12 → Network：

- `style.css?v=20260604` → 200
- `main.js?v=20260604` → 200
- 产品图 `*.jpg` → 200，体积约 50～200KB（不是 4～10MB）

首屏应直接看到 Hero 标题与右侧主机柜图，无需等待数秒。
