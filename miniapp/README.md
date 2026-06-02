# miniapp — 微信小程序（uni-app + Vue 3）

本目录为 **uni-app** 工程，使用 **Vue 3 组合式 API**，通过 **HBuilderX** 编译发布到微信小程序。

---

## Tab 与页面结构

### 底部 Tab（3 个）

| Tab | 路径 | 说明 |
|-----|------|------|
| 计划 | `pages/plan/plan` | 今日可上报；本周/全部只读；月历选日 |
| 今日 | `pages/home/home` | **启动首页**：进度、鼓励语、单词预览 |
| 我的 | `pages/mine/mine` | 登录、学习数据、功能入口 |

### 子页面一览

```
pages/
├── home/                 # 今日 Tab
├── plan/                 # 计划 Tab
├── plan-add/             # 新增学习任务（学员自定义）
├── task-study/           # 学习记录 / 计时上报
├── report-history/       # 学习历史上报列表
├── report/               # 兼容跳转 → report-history
├── mine/                 # 我的 Tab
├── register/             # 注册
├── profile/              # 个人资料
├── email-settings/       # 邮箱提醒设置
├── permission-apply/     # 权限申请 / L10 审核他人申请
├── vocab/                # 英语单词学习
├── memos/
│   ├── memos             # 备忘录列表
│   └── memo-edit         # 新建/编辑备忘录
└── toolbox/
    ├── toolbox           # 工具箱入口
    ├── calculator        # 计算器（L0+）
    ├── qrcode            # 二维码扫码/生成（L1+）
    ├── ops-platform      # 运维平台调试（L3+）
    └── charger-bluetooth # 充电桩蓝牙（开发中）
```

---

## 「我的」页菜单结构

| 区块 | 顺序 | 入口 |
|------|------|------|
| **学习** | 1 | 新增学习任务、查看学习计划、学习记录 |
| **工具** | 2 | 备忘录、工具箱 |
| **账户**（需登录） | 3 | 个人资料、界面风格、权限申请、邮箱提醒设置 |

---

## 权限等级说明

| 等级 | 能力 |
|------|------|
| L0 | 计算器 |
| L1+ | 二维码（扫码、生成） |
| L3+ | 工具箱运维调试（直连 cms） |
| L10 | **最终管理员**：在「权限申请」页审核他人待审申请 |

申请更高权限：**我的 → 账户 → 权限申请**。

---

## 备忘录

- 路径：`pages/memos/memos`（**我的 → 工具 → 备忘录**）
- 需登录；数据按账号隔离，云端增删改查
- 支持搜索、下拉刷新、分页加载

---

## 工具箱

路径：`pages/toolbox/toolbox`

| 工具 | 最低权限 | 说明 |
|------|----------|------|
| 计算器 | L0 | 四则运算 |
| 二维码 | L1 | 扫码解码、文字生成二维码图 |
| 运维平台调试 | L3 | 直连 `https://cms.iesztn.com` 查充电站/桩 |
| 充电桩蓝牙 | L3 | 占位，开发中 |

运维平台需在小程序后台 request 合法域名添加：`cms.iesztn.com`（本地可勾选不校验合法域名）。

---

## 环境配置（`config/index.js`）

| 模式 | 说明 |
|------|------|
| **prod（默认）** | `https://server.jiankalka.cn/api/v1`，真实微信登录 |
| **dev（Mock）** | 控制台执行 `uni.setStorageSync('api_env_override','dev')` 后重新编译；演示数据、昵称「演示学员」 |

恢复线上：`uni.removeStorageSync('api_env_override')` 并退出登录后重新编译。

---

## HBuilderX 使用步骤

1. **文件 → 导入** → 选择本 `miniapp` 目录  
2. `manifest.json` → 微信小程序配置 → 填写 **AppID**  
3. **运行 → 运行到小程序模拟器 → 微信开发者工具**  
4. 正式发布：**发行 → 小程序-微信** → 微信开发者工具上传审核  

> 开发者工具请打开编译目录 **`unpackage/dist/dev/mp-weixin`**（含 `app.json`），不要直接以源码根目录为小程序根目录。

---

## 与后端主要接口

| 功能 | 接口 |
|------|------|
| 登录/注册 | `POST /auth/wx-login`、`POST /auth/wx-register` |
| 当前用户 | `GET /auth/me` |
| 计划 | `GET /plans/today|week`、`GET /plans/items` 等 |
| 上报 | `POST /reports`、`GET /reports` |
| 统计 | `GET /stats/summary` |
| 词库 | `GET /vocab/preview`、`GET /vocab/set` |
| 备忘录 | `GET/POST /memos`、`PATCH/DELETE /memos/:id` |
| 权限申请 | `POST/GET /auth/permission-requests` |
| L10 审核 | `GET /auth/permission-requests/review-queue`、`PATCH .../:id/review` |

约定见 [docs/api-convention.md](../docs/api-convention.md)。

---

## 主题与样式

- 全局主题：`utils/theme.js`（经典蓝、女神粉等）  
- 页面通过 `<theme-page-meta />` 与 CSS 变量 `--theme-*` 适配导航栏与 TabBar  
- 公共按钮样式：`styles/buttons.scss`  

---

## 常见运行问题

### `wx is not defined` / 白屏

1. 调试基础库选 **3.3.x / 3.4.x 稳定版**，避免灰度过新版本  
2. 导入目录为 **`unpackage/dist/dev/mp-weixin`**  
3. HBuilder 重新「运行到微信」；工具 → 清缓存；可删除 `unpackage` 后重编译  
4. `manifest.json` 保持 `enhance: false`  

### `placeholder` 导致 WXML 编译错误

`textarea` / `input` 的 `placeholder` **不要写真实换行**；多行提示请绑定到 `:placeholder` 变量（单行字符串）。

### `invalid app.json permission scope.*`

已在 `manifest.json` 移除过时 `permission` 配置；相机/相册权限在使用时由 API 触发。

---

## 技术栈

- uni-app（Vue 3，`vueVersion: 3`）  
- `<script setup>` + `ref` / `computed`  
- SCSS + `uni.scss`  
