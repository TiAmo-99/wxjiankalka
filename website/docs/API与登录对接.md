# API 与登录对接说明（官网）

官网前端对接现有 Node API，基础路径：

**生产**：`https://server.jiankalka.cn/api/v1`  
**本地**：`http://localhost:3000/api/v1`

完整约定见仓库 [docs/api-convention.md](../../docs/api-convention.md)。

---

## 1. 响应格式

```json
{
  "code": 0,
  "message": "ok",
  "data": { }
}
```

| code | 含义 |
|------|------|
| `0` | 成功 |
| `10001` | 参数错误 |
| `20001` | 未登录 / 凭证无效 |
| `20002` | 账号不可用 |
| `20003` | 无权限 |
| `30006` | 手机号已被使用 |
| `30007` | 未开放自助注册 |
| `30009` | 账号未设置密码 |

鉴权头：

```http
Authorization: Bearer <token>
```

---

## 2. 官网必用接口

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/auth/phone-login` | `{ phone, password }` | 否 |
| POST | `/auth/phone-register` | `{ phone, password, nickname, realName? }` | 否 |
| POST | `/auth/set-initial-password` | 微信用户首次设密 | 否 |
| GET | `/auth/me` | 当前用户（含 `permLevel`） | 是 |
| PATCH | `/auth/me` | 更新昵称/手机等 | 是 |
| PATCH | `/auth/password` | 修改密码 | 是 |
| POST | `/auth/permission-requests` | 申请权限等级 | 是 |
| GET | `/auth/permission-requests` | 我的申请列表 | 是 |
| POST | `/tools/qrcode` | `{ text, size? }` → PNG base64 | 是，L1+ |

实现参考：

- 路由：`server/src/routes/auth.js`、`server/src/routes/tools.js`
- 服务：`server/src/services/authService.js`
- 小程序封装：`miniapp/utils/auth.js`、`miniapp/utils/request.js`
- 管理后台封装：`website/admin/src/api/request.js`

---

## 3. 登录流程（官网）

```
1. 用户提交手机号、密码
2. POST /auth/phone-login
3. code===0 → 保存 data.token
4. GET /auth/me → 展示 permLevel、昵称
5. 进入 redirect 或 /app
```

**未设密码**（仅微信注册）：引导 `POST /auth/set-initial-password`（需手机号 + 昵称校验，与小程序一致）。

---

## 4. 跨域与部署

### 方案 A（推荐）：www 同源反代

Nginx 在 `www.jiankalka.cn`：

```nginx
location /api/ {
    proxy_pass https://server.jiankalka.cn/api/;
    proxy_set_header Host server.jiankalka.cn;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

前端配置：

```js
const baseURL = '/api/v1'
```

优点：同源、可 httpOnly Cookie、无浏览器 CORS 预检问题。

### 方案 B：直连 server 子域

前端：

```js
const baseURL = 'https://server.jiankalka.cn/api/v1'
```

服务端需收紧 CORS（当前 `server/src/app.js` 为 `cors()` 全开放，生产建议改为）：

```js
cors({
  origin: ['https://www.jiankalka.cn'],
  credentials: true
})
```

---

## 5. 前端 request 封装要点

1. 统一解析 `code !== 0` 为业务错误并 toast。
2. `20001` / `20002` 清除 token 并跳转 `/login`。
3. `20003` 展示「权限不足」并链到 `/app/permission`。
4. 请求超时、网络错误与 API 错误区分提示。

可与 `website/admin/src/api/request.js` 对齐逻辑，baseURL 改为官网配置。

---

## 6. 环境变量（规划）

官网 `.env` 示例（工程初始化后使用）：

```env
# 方案 A
VITE_API_BASE=/api/v1

# 方案 B
# VITE_API_BASE=https://server.jiankalka.cn/api/v1

VITE_SITE_NAME=建咖充电
VITE_WX_MINI_PROGRAM_NAME=wxjiankalka
```

---

## 7. 健康检查

```bash
curl -s https://server.jiankalka.cn/api/v1/health
```

部署 www 后可在 CI 或宝塔监控中同时探测 www 首页与上述 health。
