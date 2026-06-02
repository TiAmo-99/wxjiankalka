# server — 考研学习记录 API

Node.js + Express + **MySQL**，与 `miniapp` 小程序联调。

## 快速开始

### 1. 在宝塔创建 MySQL 数据库

- 数据库名：`jiankalka`（可自定，与 `.env` 一致即可）
- 用户名 / 密码：记下并写入 `.env`
- **只需创建空库**，表由项目自动迁移

### 2. 安装并初始化

```bash
cd server
cp .env.example .env
# 编辑 .env，填写 MYSQL_* 

npm install
npm run db:reset    # 建表 + 种子数据
npm run dev
```

服务地址：`http://localhost:3000/api/v1`

管理后台（构建后）：`http://localhost:3000/admin/#/login`

```bash
npm run build:admin   # 需先在 admin-web 执行过 npm install
```

## 小程序联调

1. `miniapp/config/index.js` 设置 `useMock: false`（生产用 `ENV = 'prod'`）
2. 微信开发者工具勾选「不校验合法域名」（仅本地调试）
3. 生产环境配置 `WX_APPID`、`WX_SECRET`

## 种子账号

| 类型 | 说明 |
|------|------|
| 管理员 | `admin` / `.env` 中 `SEED_ADMIN_PASSWORD` |
| 学员（开发） | openid = `DEV_OPENID`（默认 `dev_openid_demo`） |

## 数据库命令

| 命令 | 说明 |
|------|------|
| `npm run db:migrate` | 仅建表（`src/db/schema.sql`） |
| `npm run db:import-vocab` | 导入 JSON/TXT 词表（默认 `data/vocab-kaoyan-seed.json`） |
| `npm run db:import-vocab:kaoyan` | 下载并导入考研约 9600 词（KyleBing 开源词表） |
| `npm run db:seed` | 建表并清空后写入演示数据 |
| `npm run db:reset` | 同 seed（迁移 + 种子） |

## 生产部署

见 [docs/deploy.md](../docs/deploy.md)。

## 目录结构

```
server/
├── admin-web/          # 管理后台 Vue 源码
├── public/admin/       # 构建产物（npm run build:admin）
├── src/routes/admin.js # 管理 API
└── src/db/ ...
```
