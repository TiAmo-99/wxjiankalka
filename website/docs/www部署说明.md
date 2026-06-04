# www.jiankalka.cn 部署说明

与 API 站点 **分离部署**。API 细节见仓库 [docs/deploy.md](../../docs/deploy.md)。

---

## 1. 域名与 DNS

| 记录 | 主机记录 | 值 | 用途 |
|------|----------|-----|------|
| A | `www` | `182.92.157.86` | 官网静态/SSR |
| A | `server` | `182.92.157.86` | 已有 API + admin |

验证：

```bash
ping www.jiankalka.cn
ping server.jiankalka.cn
```

---

## 2. 宝塔：www 站点

1. **网站** → **添加站点** → 域名 `www.jiankalka.cn`（可同时勾选根域 `jiankalka.cn` 301 到 www）。
2. 根目录示例：`/www/wwwroot/www.jiankalka.cn`
3. **SSL** → Let's Encrypt → 强制 HTTPS。
4. 将 `website` 构建产物（如 `dist/`）上传到站点根目录，或 CI/rsync 发布。

### 2.1 纯静态（首期）

构建命令（工程初始化后，以 Vite 为例）：

```bash
cd website
npm install
npm run build
# 将 dist/* 复制到 /www/wwwroot/www.jiankalka.cn
```

Nginx 需支持 SPA 回退（若使用 history 路由）：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 2.2 API 反代（推荐，方案 A）

在同一 www 站点配置：

```nginx
location /api/ {
    proxy_pass https://server.jiankalka.cn/api/;
    proxy_ssl_server_name on;
    proxy_set_header Host server.jiankalka.cn;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

前端生产环境 `VITE_API_BASE=/api/v1`。

---

## 3. 与 server 站点关系

```
www.jiankalka.cn     →  Nginx 静态（+ 可选 /api 反代）
server.jiankalka.cn  →  Nginx 反代 127.0.0.1:3000（PM2 jiankalka-api）
```

**不要**把官网与 API 混在同一站点根目录下随意改 `root`，避免覆盖 `public/admin`。

---

## 4. 发布检查清单

| 项 | 检查 |
|----|------|
| HTTPS | www 证书有效，HTTP 跳转 HTTPS |
| 首页 | 200，资源 200 |
| 登录 | `POST /api/v1/auth/phone-login` 或反代路径成功 |
| `/auth/me` | 带 Bearer 返回用户信息 |
| 404 | SPA 刷新子路由不 404 |
| 隐私页 | `/legal/privacy` 可访问 |
| API 健康 | `curl https://server.jiankalka.cn/api/v1/health` |

---

## 5. 安全组与防火墙

与 API 部署相同：阿里云安全组、宝塔防火墙放行 **80、443**。

---

## 6. 后续：服务端 CORS（仅方案 B 需要）

若前端直连 `server.jiankalka.cn` 而非反代，修改 `server/src/app.js` 中 `cors()` 为白名单 `https://www.jiankalka.cn` 后 `pm2 restart jiankalka-api`。

---

## 7. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-06-04 | 初稿 |
