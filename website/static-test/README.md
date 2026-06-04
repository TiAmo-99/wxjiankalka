# 公网测试静态站

可直接上传到宝塔 HTML 项目根目录，验证 `www.jiankalka.cn` 是否公网可访问。

## 文件清单

```
static-test/
├── index.html      ← 必须放在站点根目录
├── css/style.css
├── js/main.js
└── README.md       （不必上传）
```

## 部署方式

### A. Git 拉取（推荐）

见 [../docs/Git部署-www站点.md](../docs/Git部署-www站点.md)：服务器 `git clone` / `git pull` 后，将宝塔网站根目录指向本文件夹，或执行 `bash website/scripts/deploy-www.sh`。

### B. 手动上传

1. 打开 **文件** → 进入 `/www/wwwroot/www.jiankalka.cn`
2. **删除或清空** 目录内宝塔默认的 `index.html`（若有）
3. 将本目录下 **`index.html`、`css/`、`js/`** 全部上传到此根目录（保持子文件夹结构）
4. 确认站点 **SSL** 已开启（建议用 `https://www.jiankalka.cn` 访问）
5. 浏览器访问：`https://www.jiankalka.cn/`

看到「网站部署成功」即表示 HTML 项目正常。

## 本地预览（可选）

用浏览器直接打开 `index.html`，或在本目录执行：

```bash
npx --yes serve .
```

## 正式站替换

后续 Vue 工程 `npm run build` 后，用 `dist/` 内文件**覆盖**本目录内容即可。
