# server — 考研学习记录 API（纯后端）

Node.js + Express + **MySQL**，为微信小程序与网页管理后台提供 REST API。

| 角色 | 地址 |
|------|------|
| **API** | `https://server.jiankalka.cn/api/v1` |
| **网页管理后台** | `https://www.jiankalka.cn/manage/login.html`（静态页，见 `website/static-test/manage/`） |

本目录**不再**托管 `/admin` 静态资源。

---

## 快速开始

```bash
cd server
cp .env.example .env
# 编辑 MYSQL_*、JWT_SECRET、WX_APPID、WX_SECRET

npm install
npm run db:migrate
npm run dev
```

验证：

```bash
curl http://localhost:3000/api/v1/health
```

管理员：`admin` / `.env` 中 `SEED_ADMIN_PASSWORD`（`db:seed` 或 `npm run admin:reset-password`）。

---

## 环境变量

见 `.env.example`。常用项：

| 变量 | 说明 |
|------|------|
| `MYSQL_*` | 数据库 |
| `JWT_SECRET` | JWT 签名 |
| `WX_APPID` / `WX_SECRET` | 小程序登录 |
| `ADMIN_BASE_URL` | 邮件中的管理后台根路径，默认 `https://www.jiankalka.cn/manage` |
| `SMTP_*` / `PERM_NOTIFY_EMAIL` | 权限申请邮件通知 |

---

## npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发（watch） |
| `npm start` | 生产启动 |
| `npm run db:migrate` | 建表/增量迁移（**上线必跑**） |
| `npm run db:seed` | 演示数据 |
| `npm run admin:reset-password` | 重置网页管理员密码 |
| `npm run job:email-reminder` | 邮件提醒任务 |

---

## API 前缀 `/api/v1`

- 学员：`/auth`、`/plans`、`/reports`、`/vocab`、`/memos` …
- 管理端 JSON API：`/admin/*`（需管理员 JWT，供 `www` 静态管理页调用）

响应约定见 [docs/api-convention.md](../docs/api-convention.md)。

---

## 目录结构

```
server/
├── src/
│   ├── index.js、app.js、config.js
│   ├── routes/、services/、middleware/
│   └── db/（schema、migrate、seed）
├── data/           # 词库种子
├── scripts/        # 词库导入
├── .env.example
├── UPLOAD.md       # 首次部署
└── SERVER-UPDATE.md  # 增量更新步骤
```

---

## 生产部署

- 首次：[UPLOAD.md](./UPLOAD.md)
- 更新：[SERVER-UPDATE.md](./SERVER-UPDATE.md)

```bash
npm install
npm run db:migrate
pm2 restart jiankalka-api
```
