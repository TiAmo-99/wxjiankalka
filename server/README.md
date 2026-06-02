# server — 考研学习记录 API 与管理后台

Node.js + Express + **MySQL**，为微信小程序提供 REST API，并托管网页管理后台（`/admin`）。

**生产地址**：`https://server.jiankalka.cn/api/v1`  
**管理后台**：`https://server.jiankalka.cn/admin/#/login`

---

## 快速开始

### 1. 准备 MySQL

在宝塔或本地创建**空库**（表由迁移脚本自动创建），例如：

- 数据库名：`wxjiankalka` 或 `jiankalka`（与 `.env` 中 `MYSQL_DATABASE` 一致）

### 2. 安装与初始化

```bash
cd server
cp .env.example .env
# 编辑 .env：MYSQL_*、JWT_SECRET、WX_APPID、WX_SECRET

npm install
npm run db:migrate    # 建表/补字段（不删已有数据）
npm run dev           # 默认 http://localhost:3000
```

验证：

```bash
curl http://localhost:3000/api/v1/health
```

### 3. 管理后台（本地）

```bash
cd admin-web && npm install && cd ..
npm run build:admin
# 浏览器 http://localhost:3000/admin/#/login
```

管理员账号：`admin` / `.env` 中 `SEED_ADMIN_PASSWORD`（首次 `db:seed` 或迁移种子写入）。

---

## 环境变量（`.env`）

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 3000 |
| `NODE_ENV` | `production` 时必填微信配置 |
| `JWT_SECRET` | JWT 签名密钥（长随机串） |
| `MYSQL_*` | 数据库连接 |
| `WX_APPID` / `WX_SECRET` | 微信小程序登录 |
| `ALLOW_SELF_REGISTER` | 是否允许小程序自助注册（默认 true） |
| `SMTP_*` / `MAIL_FROM` | 邮箱提醒（见 docs/email-remind.md） |
| `PERM_NOTIFY_EMAIL` | 权限申请通知邮箱（默认 jiankalka@qq.com） |
| `ADMIN_BASE_URL` | 管理后台外链（邮件中用） |

完整示例见 `.env.example`。

---

## npm 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 开发模式（watch） |
| `npm start` | 生产启动 |
| `npm run db:migrate` | 执行 schema + 增量补丁（**上线更新必跑**） |
| `npm run db:seed` | 迁移后写入演示数据 |
| `npm run db:reset` | migrate + seed（会清演示数据逻辑，慎用生产） |
| `npm run db:import-vocab` | 导入本地 JSON/TXT 词表 |
| `npm run db:import-vocab:kaoyan` | 下载并导入考研约 9600 词 |
| `npm run db:import-phrases` | 导入语料种子 |
| `npm run build:admin` | 构建 `public/admin/` |
| `npm run job:email-reminder` | 手动执行邮件提醒任务 |
| `npm run admin:reset-password` | 重置管理员密码 |

---

## API 路由概览

前缀：`/api/v1`

### 公开 / 学员（需 Bearer Token）

| 前缀 | 说明 |
|------|------|
| `GET /health` | 健康检查 |
| `/auth/*` | 微信登录/注册、管理员登录、`/me`、权限申请 |
| `/plans/*` | 学习计划查询、学员新增任务 |
| `/reports/*` | 学习上报 |
| `/stats/*` | 学习统计摘要 |
| `/vocab/*` | 单词预览、随机一组（可无需登录，以实现为准） |
| `/encouragements/*` | 首页鼓励语 |
| `/memos/*` | 学员备忘录 CRUD |

### 管理端（`/admin/*`，需管理员 JWT）

| 模块 | 说明 |
|------|------|
| `/admin/users` | 学员列表、权限等级 |
| `/admin/plan-items` | 计划项 CRUD、Excel 导入 |
| `/admin/reports` | 学习上报查询、导出 |
| `/admin/encouragements` | 鼓励话语 |
| `/admin/vocab/*` | 单词、语料 CRUD |
| `/admin/permission-requests` | 权限申请审核 |
| `/admin/memos/*` | 全站备忘录管理 |

响应格式见 [docs/api-convention.md](../docs/api-convention.md)。

---

## 目录结构

```
server/
├── src/
│   ├── index.js              # 入口
│   ├── app.js                # Express 应用
│   ├── config.js             # 读取 .env
│   ├── routes/               # 路由
│   ├── services/             # 业务逻辑
│   ├── middleware/auth.js    # JWT、学员/管理员/L10 校验
│   ├── db/
│   │   ├── schema.sql        # 全量建表
│   │   ├── migrate.js        # 迁移与增量补丁
│   │   └── migrations/       # memos、vocabulary 等补丁 SQL
│   └── jobs/                 # 定时邮件提醒
├── admin-web/                # 管理后台 Vue 源码
│   └── src/views/            # 各功能页面
├── public/admin/             # 构建产物（git 仅保留 .gitkeep）
├── data/                     # 词库种子 JSON
├── scripts/                  # 词库导入脚本
├── .env.example
└── UPLOAD.md                 # 服务器上传说明
```

---

## 主要数据表

| 表 | 说明 |
|----|------|
| `users` | 学员/管理员；`perm_level` 权限等级（0–10） |
| `study_plans` / `plan_items` | 学习计划与明细 |
| `study_reports` | 学习上报 |
| `permission_requests` | 权限升级申请 |
| `memos` | 学员备忘录 |
| `vocabulary_words` / `vocabulary_phrases` | 英语词库与语料 |
| `encouragements` | 首页鼓励语 |

---

## 权限等级（`users.perm_level`）

| 等级 | 说明 |
|------|------|
| 0–2 | 普通学员；L1+ 二维码；L3+ 工具箱 |
| 1–9 | 可通过申请或管理员授予 |
| **10** | 最终管理员：可在**小程序**审核他人权限申请（非网页管理员账号） |

网页后台管理员为 `users.role = admin`，与学员 L10 独立。

---

## 小程序联调

1. `miniapp/config/index.js` 默认 `prod` → `https://server.jiankalka.cn/api/v1`  
2. 本地调试：服务端 `npm run dev`，小程序开发者工具勾选「不校验合法域名」  
3. 生产：公众平台配置 request 合法域名 `server.jiankalka.cn`  

---

## 生产部署

详见 [docs/deploy.md](../docs/deploy.md) 与 [UPLOAD.md](./UPLOAD.md)。

```bash
git pull
npm install
npm run db:migrate
npm run build:admin
pm2 restart jiankalka-api
```

---

## 管理后台功能页

| 路由 | 功能 |
|------|------|
| `#/users` | 学员管理、修改权限等级 |
| `#/import` | 计划项 Excel 批量导入 |
| `#/reports` | 学习上报 |
| `#/encouragements` | 鼓励话语 |
| `#/vocabulary` | 英语词库 |
| `#/memos` | 学员备忘录 |
| `#/permission-requests` | 权限申请审核 |
| `#/users/:id/plans` | 某学员计划配置 |
