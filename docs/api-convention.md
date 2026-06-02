# API 约定

基础路径：`/api/v1`

## 响应格式

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
| `30001` | 学员未开通 |
| `30002` | 账号已禁用 |
| `30003` | 仅可记录今日 |
| `30005` | 微信已注册 |
| `30006` | 手机号已被使用 |
| `30007` | 未开放自助注册 |
| `40400` | 接口不存在 |
| `50000` | 服务器错误 |

HTTP 状态码：业务错误多数仍返回 `200`，鉴权失败返回 `401`，权限不足 `403`，未找到 `404`。

## 鉴权

学员/管理员登录后，请求头携带：

```
Authorization: Bearer <token>
```

## 字段命名

JSON 使用 **camelCase**（如 `planItemId`、`actualMinutes`）。服务端同时兼容 snake_case 入参。

## 学员端接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/auth/wx-login` | `{ code }` 微信登录（须已注册） |
| POST | `/auth/wx-register` | 微信注册（见下） |
| POST | `/auth/admin-login` | `{ username, password }` |
| GET | `/me` | 当前用户 |
| PATCH | `/me` | 更新昵称/手机/姓名（需登录） |
| GET | `/plans/today` | 今日计划 |
| GET | `/plans/week` | 本周计划 |
| GET | `/plans/all` | 全部计划 |
| GET | `/plans/day?date=YYYY-MM-DD` | 指定日 |
| POST | `/reports` | 学习上报（仅今日） |
| GET | `/reports/today` | 今日上报列表 |
| GET | `/stats/summary` | 统计摘要 |

### POST `/reports` 请求体

```json
{
  "reportDate": "2026-06-01",
  "planItemId": 1,
  "isOther": false,
  "completed": true,
  "actualMinutes": 50,
  "startTime": "09:00",
  "endTime": "09:50",
  "note": "备注",
  "otherSubject": "",
  "otherContent": ""
}
```

`isOther: true` 时 `planItemId` 可省略，填写 `otherSubject` / `otherContent`。

### POST `/auth/wx-register` 请求体

```json
{
  "code": "wx.login 返回的 code",
  "nickname": "学员昵称",
  "phone": "13800138000",
  "realName": "张三",
  "avatarUrl": ""
}
```

成功返回与登录相同：`{ token, nickname, user }`，用户信息写入 MySQL `users` 表。

### PATCH `/me` 请求体（学员）

```json
{
  "nickname": "新昵称",
  "phone": "13800138001",
  "realName": "李四"
}
```

## 鼓励语（小程序）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/encouragements/random` | 随机一条启用中的鼓励语（无需登录） |

## 管理端接口（需管理员 token）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/users` | 学员列表 `?page&pageSize&keyword&status` |
| GET | `/admin/users/:id` | 学员详情 |
| PATCH | `/admin/users/:id` | 更新昵称/手机/状态 |
| GET | `/admin/users/:id/stats` | 学员统计 |
| GET | `/admin/plans?userId=` | 计划列表 |
| POST | `/admin/plans` | 创建计划 |
| GET | `/admin/plan-items?userId=&from=&to=` | 计划任务 |
| POST | `/admin/plan-items` | 添加任务 |
| PATCH | `/admin/plan-items/:id` | 修改任务 |
| DELETE | `/admin/plan-items/:id` | 删除任务 |
| GET | `/admin/plan-items/import-template` | 下载批量导入 Excel 模板 |
| POST | `/admin/plan-items/import` | 上传表格批量导入（`multipart/form-data`，字段 `file`） |
| GET | `/admin/reports` | 上报列表 `?from&to&keyword&page&pageSize` |
| GET | `/admin/reports/export` | 导出上报 Excel（同筛选参数） |
| GET | `/admin/encouragements` | 鼓励语列表 |
| POST | `/admin/encouragements` | 新增 `{ content, sortOrder? }` |
| PATCH | `/admin/encouragements/:id` | 更新内容/状态/排序 |
| DELETE | `/admin/encouragements/:id` | 删除 |

## 开发环境微信登录

未配置 `WX_APPID` / `WX_SECRET` 时，任意 `code` 会映射到 `.env` 中 `DEV_OPENID` 对应学员（种子数据已创建）。
