# 首次部署 server（仅 API 后端）

## 上传内容

打包 **`server/`** 目录，包含：

```
server/
├── package.json
├── package-lock.json
├── .npmrc
├── .env.example
├── src/
├── data/          # 词库种子（可选，导入词库时需要）
├── scripts/
└── install.sh     # 可选
```

**不要上传：** `node_modules`、`.env`、日志。

**不要上传 / 可删除：** `public/admin/`、`admin-web/`（已废弃，管理页在 `www.jiankalka.cn/manage/`）。

---

## 宝塔步骤

### 1. 上传解压

路径示例：`/www/wwwroot/jiankalka-kaoyan/server/`

### 2. 配置 `.env`

```bash
cd /www/wwwroot/jiankalka-kaoyan/server
cp .env.example .env
nano .env
```

必改：`MYSQL_PASSWORD`、`WX_APPID`、`WX_SECRET`、`JWT_SECRET`  
建议：`ADMIN_BASE_URL=https://www.jiankalka.cn/manage`

### 3. 安装与迁移

```bash
bash install.sh
# 或：npm install --registry=https://registry.npmmirror.com
npm run db:migrate
```

### 4. Node 项目

- 启动文件：`src/index.js`
- 端口：`3000`（与 `.env` 一致）
- 绑定域名：`server.jiankalka.cn` → 反代 `http://127.0.0.1:3000`

### 5. 验证

```bash
curl http://127.0.0.1:3000/api/v1/health
curl https://server.jiankalka.cn/api/v1/health
```

根路径 `/` 返回 JSON 服务信息，**不再**提供 `/admin` 网页。

### 6. 管理后台

网页在 **www** 站点：`https://www.jiankalka.cn/manage/login.html`  
上传 `website/static-test/`（含 `manage/`），见 `website/static-test/README.md`。

API 登录：

```bash
curl -s -X POST https://server.jiankalka.cn/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

---

## 常见问题

| 现象 | 处理 |
|------|------|
| 管理登录失败 | `npm run admin:reset-password` |
| MySQL 失败 | 核对 `.env` 与宝塔库名 |
| 访问 `/admin` 404 | 正常；请用 www 的 `/manage/login.html` |
