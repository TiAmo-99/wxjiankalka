# server 增量更新（仅后端）

管理后台静态页已迁至 **www**，本次更新后 server **只提供 API**，不再托管 `/admin`。

---

## 一、本次变更摘要

| 变更 | 说明 |
|------|------|
| 删除 `npm run build:admin` | 不再同步前端到 `public/admin` |
| 删除 `/admin` 静态托管 | `app.js` 仅挂载 `/api/v1` |
| 删除 `ADMIN_STATIC_PATH` | `.env` 可去掉该变量 |
| `ADMIN_BASE_URL` 默认值 | 改为 `https://www.jiankalka.cn/manage`（邮件链接） |
| 可删除目录 | `server/public/admin/`、`server/admin-web/` |

**保留（勿删）：** `src/routes/admin.js` 及 `/api/v1/admin/*` — 这是管理端 **JSON API**，供 www 静态页调用。

---

## 二、需要更新到服务器的文件

用 git 拉取或手动覆盖以下路径（**整个 `src/` 建议整目录覆盖**）：

```
server/package.json
server/.env.example          # 参考用，勿覆盖生产 .env
server/src/app.js            # ★ 去掉静态托管
server/src/config.js         # ★ 去掉 adminStaticPath
server/src/services/permissionService.js
server/src/db/reset-admin.js
server/README.md
server/UPLOAD.md
server/SERVER-UPDATE.md
```

若使用压缩包上传，至少包含：`package.json`、`package-lock.json`、完整 `src/`。

**不要在服务器保留：** `public/admin/` 下大量 html/js/css（可整目录删除以省空间）。

---

## 三、服务器操作步骤

```bash
# 1. 进入项目（路径按你宝塔实际目录修改）
cd /www/wwwroot/jiankalka-kaoyan/server

# 2. 备份（推荐）
cp .env .env.bak.$(date +%Y%m%d)

# 3. 上传/解压新代码后，删除旧前端产物（可选）
rm -rf public/admin admin-web

# 4. 编辑 .env（若仍为旧 admin 地址）
nano .env
# 设置或修改：
#   ADMIN_BASE_URL=https://www.jiankalka.cn/manage
# 删除行（若有）：
#   ADMIN_STATIC_PATH=...

# 5. 依赖与数据库
npm install --registry=https://registry.npmmirror.com
npm run db:migrate

# 6. 重启 Node（宝塔 Node 项目 或 pm2）
pm2 restart jiankalka-api
# 或在宝塔面板点击「重启」
```

---

## 四、验证清单

```bash
# API 健康
curl -s https://server.jiankalka.cn/api/v1/health

# 根路径为 JSON（非跳转 /admin）
curl -s https://server.jiankalka.cn/

# 旧 admin 路径应 404
curl -sI https://server.jiankalka.cn/admin/

# 管理员登录 API
curl -s -X POST https://server.jiankalka.cn/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的密码"}'
```

浏览器：

1. 打开 `https://www.jiankalka.cn/manage/login.html` 能登录管理后台  
2. `manage/js/config.js` 或各页 `meta admin-api-base` 指向 `https://server.jiankalka.cn/api/v1`  
3. 官网 `https://www.jiankalka.cn/` 正常（与 server 更新独立，按需上传 `website/static-test/`）

---

## 五、Nginx / 宝塔建议

- **server.jiankalka.cn**：只反代 Node `3000`，不必再配置 `/admin` 静态别名。  
- **www.jiankalka.cn**：静态站根目录为 `static-test`；如需同域 API 可另加：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

此时可将 `manage/login.html` 的 API 改为 `/api/v1`（需 CORS 与 cookie 策略一致时再改）。

---

## 六、回滚说明

若需临时恢复 server 托管 admin，可从 git 历史恢复 `app.js` 与 `public/admin`，并执行旧版 `build:admin`。**推荐**始终使用 www 的 `manage/`，与官网统一部署。
