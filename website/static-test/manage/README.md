# 考研管理后台（静态 HTML）

位于 **`website/static-test/manage/`**，与个人官网同目录部署。

纯静态多页，对接 `server` API（`/api/v1/admin/*`），无需 Vue 构建。

## 页面

| 文件 | 功能 |
|------|------|
| `login.html` | 管理员登录 |
| `users.html` | 学员列表、改权限 |
| `user-plans.html?id=` | 学员每日任务 |
| `import.html` | Excel 批量导入 |
| `reports.html` | 学习上报、导出 |
| `encouragements.html` | 鼓励语 |
| `vocabulary.html` | 单词 / 语料 |
| `memos.html` | 备忘录 |
| `permission-requests.html` | 权限申请审核 |

## 部署（推荐）

与官网一并上传 **`website/static-test/`**（含本目录 `manage/`），访问：

**`https://www.jiankalka.cn/manage/login.html`**

`server` 仅提供 API，不再托管 `/admin` 静态页。

API 地址在 `login.html` 等页的 `<head>` 中配置：

```html
<meta name="admin-api-base" content="https://server.jiankalka.cn/api/v1" />
```

（加在 `login.html` 等页的 `<head>` 中）

或官网 Nginx 增加：`location /api/ { proxy_pass https://server.jiankalka.cn/api/; }`

## 本地调试

1. 启动 `server`：`cd server && npm run dev`  
2. 用静态服务打开本目录，例如：

```bash
npx serve website/static-test/manage -p 5174
```

3. 在 `manage/login.html` 的 `<head>` 临时加：

```html
<meta name="admin-api-base" content="http://127.0.0.1:3000/api/v1" />
```

4. 打开 `http://localhost:5174/login.html`

## 与旧 Vue 版

原 `website/admin`（Vue）已废弃，请仅维护本目录。
