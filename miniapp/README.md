# miniapp — 微信小程序（uni-app + Vue 3）

本目录为 **uni-app** 工程，使用 **Vue 3** 编写，通过 **HBuilder X** 编译发布到微信小程序。

## 目录说明

```
miniapp/
├── pages/           # 页面
│   ├── home/        # 今日（启动首页）：提示、进度、任务速览
│   ├── plan/        # 计划：今日可上报；本周/全部只读
│   ├── mine/        # 我的：登录、学习统计
│   ├── task-study/  # 学习记录 + 计时器
│   └── report/      # 已废弃，自动跳转今日
├── static/          # 静态资源（Tab 图标等）
├── components/      # 公共组件（按需添加）
├── utils/           # 工具（request、auth）
├── config/          # 环境配置（API 地址）
├── App.vue
├── main.js
├── manifest.json    # 应用配置（含 mp-weixin AppID）
├── pages.json       # 页面路由与 TabBar
└── uni.scss         # 全局样式变量
```

## HBuilder X 使用步骤

1. 打开 **HBuilder X** → 文件 → 导入 → 从本地目录导入，选择本 `miniapp` 目录。
2. 在 `manifest.json` → **微信小程序配置** 中填写你的 **AppID**（测试可先使用测试号）。
3. 在 `config/index.js` 中配置后端 `baseUrl`（开发环境默认 `http://localhost:3000/api/v1`）。
4. 菜单 **运行** → **运行到小程序模拟器** → **微信开发者工具**（需已安装并登录微信开发者工具）。
5. 正式发布：**发行** → **小程序-微信**，再用微信开发者工具上传审核。

## 微信开发者工具注意

- 本地调试若请求 `localhost`，需在开发者工具中勾选「不校验合法域名」。
- 体验版/正式版须在公众平台配置 **request 合法域名** 为生产 API 域名。

## 备忘录（需登录）

路径：`pages/memos/memos`（我的 → 工具 → 备忘录）

- 云端增删改查，按账号隔离
- 服务端表 `memos`，部署后执行 `npm run db:migrate`

## 工具箱

路径：`pages/toolbox/toolbox`

| 工具 | 权限 | 说明 |
|------|------|------|
| 计算器 | L0（全员） | 四则运算 |
| 二维码 | L1+ | 扫码解码、文字生成二维码 |
| 充电桩蓝牙调试 | L3+ | 开发中 |
| 运维平台调试 | L3+ | 直连 cms 查询充电站/桩 |

## 工具箱 · 运维平台调试

路径：`pages/toolbox/ops-platform`（需权限 **L3+**）

- 直连 `https://cms.iesztn.com`（与 jzywApp 相同 `/chgyw/*` 接口）
- 顶部输入运维 **手机号、密码**，自动写入本地存储（`ops_platform_login_id` / `ops_platform_password`）
- 功能：充电站列表、站下充电桩列表、按桩编号查询桩详情与告警摘要

**微信小程序后台** → 开发管理 → 开发设置 → **服务器域名** → request 合法域名增加：

`https://cms.iesztn.com`

本地开发可在开发者工具勾选「不校验合法域名」；正式版必须配置。

## 与后端联调

- 登录：`utils/auth.js` → `POST /auth/wx-login`
- 计划：`pages/plan/plan.vue` → `/plans/today|week|all`
- 学习记录/计时：`pages/task-study/task-study.vue` → `POST /reports`
- 学习记录列表：`pages/report-history/report-history.vue`
- 旧路由 `pages/report/report.vue` → 自动跳转学习记录列表

### 环境开关（`config/index.js`）

| 模式 | 说明 |
|------|------|
| **prod（默认）** | 请求 `https://server.jiankalka.cn/api/v1`，微信登录为真实账号 |
| **dev（需手动开启）** | Mock 数据，登录显示「演示学员」；控制台执行 `uni.setStorageSync('api_env_override','dev')` 后重新编译 |

若曾误开 Mock，请 **退出登录**，执行 `uni.removeStorageSync('api_env_override')`，清缓存后重新运行。

## 常见运行报错排查

### `wx is not defined` / `afterPackageCommonEvaluation` / `setPageTypeById`

多为 **开发者工具基础库过高** 或 **打开了错误目录**。

1. **详情 → 本地设置 → 调试基础库**：选 **3.3.5** 或 **3.4.x 稳定版**，不要选 **3.15.x** 灰度版（日志里 `lib: 3.15.2` 即此问题）。
2. 导入目录必须是编译产物：**`miniapp/unpackage/dist/dev/mp-weixin`**（该目录下应有 `app.json`）。**不要**在 `project.config.json` 里配置 `miniprogramRoot`。
3. HBuilder：**运行 → 运行到小程序模拟器 → 微信**（不要只开开发者工具不编译）。
4. **工具 → 清缓存 → 全部清除**；删除 `miniapp/unpackage` 后重新运行编译。
5. `manifest.json` 保持 `enhance: false`（已配置）。

### `pageframeLoader is not defined`（渲染层）

1. 已在 `manifest.json` 关闭 **增强编译**（`enhance: false`），修改后需 **重新运行编译**。
2. 微信开发者工具：**详情 → 本地设置** → 调试基础库选 **3.3.x 稳定版**（勿用灰度）。
3. **工具 → 清缓存 → 全部清除**，并删除项目下 `unpackage` 目录后，在 HBuilder X 重新「运行到微信」。
4. 确认导入/打开目录为 **`unpackage/dist/dev/mp-weixin`**，不要直接打开 `miniapp` 源码根目录。

### `document.querySelector / getElementById is not a function`（VMxx）

多为 **开发者工具自身调试页** 的报错，不是业务 Vue 代码（小程序没有完整 DOM）。若模拟器白屏，优先处理 `pageframeLoader`；可忽略 VM 编号脚本中的 DOM 报错。

### `Failed to load resource: 500`

1. 检查 Tab 图标是否存在：`static/tab/*.png`（81×81），重新编译后 `mp-weixin/static/tab` 下应有同名文件。缺失时执行：`pip install pillow && python scripts/download-tab-icons.py`（图标来自 [Icons8](https://icons8.com)）。
2. 若控制台是请求 `localhost` API 返回 500，属后端未启动，与页面渲染无关；本地开发可保持 `urlCheck: false`。

## 技术栈

- uni-app（Vue 3，`vueVersion: 3`）
- 组合式 API（`<script setup>`）
- SCSS + `uni.scss` 变量
