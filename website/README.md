# www.jiankalka.cn 个人官网

充电桩产品营销 + Web 小工具。**默认按独立站建设**，与仓库内 `miniapp/`、`server/` 无耦合；若需共用考研小程序账号，见「对接现有 API」文档。

## 文档索引

### 独立站（推荐）

| 文档 | 说明 |
|------|------|
| [docs/独立站-架构与开发思路.md](./docs/独立站-架构与开发思路.md) | **语言选型、分层架构、前后端分离 vs 单体、分阶段开发** |
| [docs/个人官网-设计方案.md](./docs/个人官网-设计方案.md) | 站点 IA、页面规划、产品内容模型（与是否独立无关） |
| [docs/www部署说明.md](./docs/www部署说明.md) | 宝塔 `www` 站点、SSL（独立 API 或纯静态均适用） |

### 可选：对接现有 server / 小程序

| 文档 | 说明 |
|------|------|
| [docs/API与登录对接.md](./docs/API与登录对接.md) | 复用 `server.jiankalka.cn` 登录与工具 API |
| [docs/工具迁移与权限.md](./docs/工具迁移与权限.md) | 小程序工具箱与 `perm_level` 对照 |

## 推荐技术栈（独立站）

| 部分 | 技术 |
|------|------|
| 前端 | TypeScript、Vue 3、Vite（或 Nuxt 3 做 SEO） |
| 后端（按需） | Node.js + Express/Fastify，或 Python + FastAPI |
| 数据库 | SQLite 起步 → MySQL/PostgreSQL |
| 部署 | Nginx + 宝塔；单机可用「一个后端进程 + 静态站」单体部署 |

## 公网测试页（可立即上传）

目录 **[static-test/](./static-test/)**：纯 HTML/CSS/JS。  
- **Git 部署**：[docs/Git部署-www站点.md](./docs/Git部署-www站点.md)  
- **手动上传**：[static-test/README.md](./static-test/README.md)

## 规划目录

```
website/
├── static-test/  # 宝塔 HTML 项目公网测试（当前可用）
├── web/          # 前端（待初始化 Vue）
├── api/          # 后端（可选；纯静态阶段可无）
├── content/      # 产品 JSON、Markdown
└── docs/
```

## 仓库关系

```
jiankalka-kaoyan/
├── miniapp/     # 微信小程序 — 独立项目，可不关联
├── server/      # 考研 Node API — 独立项目，可不关联
└── website/     # 个人官网 — 本目录
```

## 相关仓库文档

- [docs/充电桩蓝牙调试-实施方案.md](../docs/充电桩蓝牙调试-实施方案.md) — BLE 能力仍适合小程序/App，非官网必选
