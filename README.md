# 考研学习记录系统（wxjiankalka）

微信小程序 + Node.js API + 网页管理后台，面向考研学员的学习计划、每日上报、英语词库与云端备忘录。

**代码仓库**：https://github.com/TiAmo-99/wxjiankalka

**生产 API**：`https://server.jiankalka.cn/api/v1`  
**管理后台**：`https://www.jiankalka.cn/manage/login.html`

---

## 系统组成

```
┌──────────────────┐     HTTPS      ┌────────────────────────────┐
│ 微信小程序        │ ─────────────► │ 云服务器 (Express + MySQL)  │
│ uni-app · Vue 3  │                │ · REST API                  │
└──────────────────┘                │ · 管理后台 SPA (/admin)     │
                                    │ · 定时邮件提醒 (cron)       │
                                    └──────────────▲─────────────┘
┌──────────────────┐     HTTPS                   │
│ 网页管理后台      │ ────────────────────────────┘
│ Vue 3 + Vite     │
└──────────────────┘
```

---

## 目录结构

```
wxjiankalka/
├── miniapp/              # 考研学习微信小程序（Vue 3）
├── miniapp-tool/         # 简卡拉卡Tool 运维小程序（AppID wxa1ac0f0b4deb35e7）
├── server/               # Node.js API（纯后端）
│   ├── src/              # 路由与服务
│   └── data/             # 词库种子 JSON
├── website/              # www 个人官网 + 管理后台静态页
│   └── static-test/      # 官网 + manage/
└── docs/                 # 需求、部署、接口约定等文档
```

| 目录 | 说明 |
|------|------|
| [miniapp/](./miniapp/) | 考研学习小程序，见 [miniapp/README.md](./miniapp/README.md) |
| [miniapp-tool/](./miniapp-tool/) | 充电桩运维 **简卡拉卡Tool**，见 [miniapp-tool/README.md](./miniapp-tool/README.md) |
| [server/](./server/) | API 后端，见 [server/README.md](./server/README.md) |
| [website/](./website/) | 个人官网 + 管理后台前端，见 [website/README.md](./website/README.md) |
| [docs/](./docs/) | 项目文档索引见下文 |

---

## 核心功能（已实现）

| 模块 | 学员端（小程序） | 管理端（Web） |
|------|------------------|---------------|
| 学习计划 | 今日可上报；本周/全部只读；月历视图 | 学员计划项 CRUD、Excel 批量导入 |
| 学习上报 | 计划项上报、其他学习、学习记录列表 | 学习上报查询与导出 |
| 今日首页 | 进度、鼓励语、单词预览 | 鼓励话语 CRUD |
| 英语词库 | 随机单词/语料学习页 | 单词与语料 CRUD、批量导入 |
| 备忘录 | 云端增删改查、搜索 | 全站备忘录查看与审核 |
| 权限等级 | L0 计算器；L1+ 二维码；L3+ 工具箱（含充电桩蓝牙运维）；L10 小程序内审核他人申请 | 学员权限、权限申请处理 |
| 账号 | 微信/手机号登录、注册、个人资料、邮箱提醒、隐私协议 | 学员管理 |
| 充电桩运维 | L3+ 工具箱：BLE 连接、充电监控、参数配置、固件升级（CCU621） | — |
| 主题 | 多主题切换（经典蓝 / 女神粉等） | — |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/考研学习记录系统-需求与实施方案.md](./docs/考研学习记录系统-需求与实施方案.md) | **需求基线**：功能、架构、数据模型、分阶段计划与修订记录 |
| [docs/deploy.md](./docs/deploy.md) | 阿里云 + 宝塔部署（API 子域名、PM2、SSL） |
| [docs/api-convention.md](./docs/api-convention.md) | 统一响应格式、错误码 |
| [docs/vocab.md](./docs/vocab.md) | 词库导入命令与 API |
| [docs/email-remind.md](./docs/email-remind.md) | 邮箱定时提醒配置 |
| [docs/wechat-notify.md](./docs/wechat-notify.md) | 微信订阅消息（规划/二期） |
| [docs/充电桩蓝牙调试-实施方案.md](./docs/充电桩蓝牙调试-实施方案.md) | **CCU621** BLE 协议、页面与联调说明 |
| [docs/微信小程序审核-隐私合规.md](./docs/微信小程序审核-隐私合规.md) | 隐私保护指引、蓝牙/选文件等审核要点 |
| [website/docs/独立站-架构与开发思路.md](./website/docs/独立站-架构与开发思路.md) | **www** 独立站：语言、架构、前后端是否分离 |
| [website/docs/个人官网-设计方案.md](./website/docs/个人官网-设计方案.md) | **www** 页面规划与产品内容（可不绑 server） |
| [server/UPLOAD.md](./server/UPLOAD.md) | 服务端首次部署 |
| [server/SERVER-UPDATE.md](./server/SERVER-UPDATE.md) | 服务端增量更新 |

---

## 快速开始（本地）

### 1. 服务端

```bash
cd server
cp .env.example .env
# 编辑 .env：MYSQL_*、WX_APPID、WX_SECRET、JWT_SECRET

npm install
npm run db:migrate          # 建表（含 memos、词库、权限申请等）
npm run db:import-vocab     # 可选：导入演示词库
npm run dev                 # http://localhost:3000/api/v1
```

管理后台（静态页，另开终端）：

```bash
npx serve website/static-test/manage -p 5174
# login.html 的 meta 指向 http://127.0.0.1:3000/api/v1
```

### 2. 小程序

1. HBuilderX 导入 `miniapp/` 目录  
2. `manifest.json` 填写微信小程序 AppID  
3. 本地联调：微信开发者工具勾选「不校验合法域名」  
4. **运行到微信开发者工具**（编译产物在 `miniapp/unpackage/dist/dev/mp-weixin`）

生产环境默认请求 `https://server.jiankalka.cn/api/v1`（见 `miniapp/config/index.js`）。

---

## 部署概要

```bash
# 服务器上
cd server
git pull
npm install
npm run db:migrate
pm2 restart jiankalka-api
```

官网与管理后台：上传 `website/static-test/` 到 www 站点。

小程序使用 HBuilderX **发行 → 小程序-微信** 上传。详细步骤见 [docs/deploy.md](./docs/deploy.md)。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 小程序 | uni-app、Vue 3、组合式 API、SCSS |
| API | Node.js 18+、Express、mysql2、JWT |
| 管理后台 | Vue 3、Vite、Hash 路由 |
| 数据库 | MySQL 5.7 / 8.0 |

---

## 安全说明

- **切勿**将 `server/.env` 提交到 Git（已在 `.gitignore` 中排除）  
- 生产环境必须配置 `WX_APPID`、`WX_SECRET` 与强 `JWT_SECRET`  
- 管理员密码通过 `.env` 中 `SEED_ADMIN_PASSWORD` 初始化  

---

## 许可证与维护

本项目为考研学习场景自用/团队项目。需求变更请更新主文档版本号与 [修订记录](./docs/考研学习记录系统-需求与实施方案.md#18-修订记录)。
