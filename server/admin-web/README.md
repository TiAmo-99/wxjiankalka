# admin-web — 网页管理后台

Vue 3 + Vite 单页应用，构建后输出到 `server/public/admin/`，由 Express 以 `/admin` 路径托管。

**生产访问**：https://server.jiankalka.cn/admin/#/login

---

## 开发

```bash
cd server/admin-web
npm install
npm run dev          # 开发服务器，API 代理见 vite.config.js
```

## 构建

在 `server/` 目录执行：

```bash
npm run build:admin
```

产物目录：`server/public/admin/`（勿提交构建文件，仅保留 `.gitkeep`）。

---

## 页面路由

| 路径 | 页面 | 功能 |
|------|------|------|
| `#/login` | Login | 管理员登录 |
| `#/users` | Users | 学员列表、修改权限等级 |
| `#/users/:id/plans` | UserPlans | 某学员计划项 |
| `#/import` | TaskImport | Excel 批量导入计划 |
| `#/reports` | Reports | 学习上报 |
| `#/encouragements` | Encouragements | 鼓励话语 |
| `#/vocabulary` | Vocabulary | 单词与语料 |
| `#/memos` | Memos | 学员备忘录 |
| `#/permission-requests` | PermissionRequests | 权限申请审核 |

---

## API 调用

- 封装：`src/api/request.js`（`fetch` + Bearer Token）
- 基础路径：`/api/v1`，管理接口前缀 `/admin`
- 登录：`POST /api/v1/auth/admin-login` → `localStorage` 存 `admin_token`

详见 [server/README.md](../README.md) 与 [docs/api-convention.md](../../docs/api-convention.md)。
