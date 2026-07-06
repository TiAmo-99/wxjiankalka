# www.jiankalka.cn 网站根目录（统一部署）

本目录为**整站**静态资源：个人官网 + 考研管理后台，一次上传即可。

## 目录结构

```
static-test/
├── index.html          # 个人官网首页
├── manage/             # 考研管理后台（静态 HTML）
├── tools/              # 在线工具箱（二维码 / JSON / 转换）
├── css/  js/  images/
└── README.md
```

## 入口

| 地址 | 说明 |
|------|------|
| `/` | 个人官网 |
| `/tools/qrcode.html` | 工具箱 · 二维码 |
| `/tools/json.html` | 工具箱 · JSON |
| `/tools/convert.html` | 工具箱 · 转换/长度 |
| `/manage/login.html` | 微信小程序管理后台 |

官网顶栏 **「网站导航」** 含外部站点与管理后台；**「工具箱」** 下拉进入上述工具；页脚亦可直达 manage。

## 部署（宝塔）

1. 换图后可选：`python website/scripts/compress-product-images.py`
2. 上传**整个** `static-test/` 到 `/www/wwwroot/www.jiankalka.cn/`（含 `manage/`）
3. 清缓存后 **Ctrl+F5** 强刷（CSS/JS 带 `?v=` 版本号）

### 管理后台 API

默认 `https://server.jiankalka.cn/api/v1`（见 `manage/login.html` 内 `meta admin-api-base`）。

## 本地预览

```bash
cd website/static-test
npx serve .
```

- 官网：http://localhost:3000/
- 工具：http://localhost:3000/tools/qrcode.html
- 管理：http://localhost:3000/manage/login.html

## 新增外链

编辑 `index.html` 顶栏下拉，或 `js/site-config.js` 中 `nav` 数组。
