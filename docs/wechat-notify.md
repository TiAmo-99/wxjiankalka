# 学习提醒：早 9 / 下午 2 / 晚 9 微信推送方案

## 结论：可以实现

在**用户已授权**的前提下，服务端定时任务可在 **9:00、14:00、21:00** 向学员发送提醒。  
你有**自有公众号**时，推荐采用 **「小程序订阅消息 + 公众号（服务号）模板消息」双通道**，覆盖面和到达率更好。

---

## 先弄清：微信不允许什么

| 方式 | 能否每天固定 3 次群发 |
|------|----------------------|
| 订阅号「群发」 | ❌ 每月约 4 次，不适合 |
| 小程序订阅（一次性） | ⚠️ 用户点 1 次「允许」≈ 只能发 **1 条**（该模板） |
| 小程序长期订阅 | ⚠️ 仅部分类目开放，需审核 |
| **服务号模板消息** | ✅ 常用方案（用户关注 + 业务提醒场景） |
| **小程序订阅 + 每日重新授权** | ✅ 可行但体验一般 |

因此：**有服务号公众号时，以服务号模板消息为主；小程序订阅消息为辅**。

---

## 推荐架构（本项目）

```
┌─────────────┐     登录/注册      ┌──────────────┐
│  微信小程序  │ ───────────────► │  Node API    │
│  学员端     │   订阅授权上报    │  jiankalka   │
└─────────────┘                  └──────┬───────┘
       │                                │
       │ 同一微信开放平台 UnionID        │ 9:00 / 14:00 / 21:00
       ▼                                ▼
┌─────────────┐                  ┌──────────────┐
│  微信公众号  │ ◄── 模板消息 ─── │  定时任务     │
│ （服务号）   │                  │  cron / PM2  │
└─────────────┘                  └──────────────┘
```

### 前提条件

1. **小程序与公众号绑定到同一「微信开放平台」账号**  
   → 登录后可拿到 **unionid**，把小程序 openid 与公众号 openid 关联到同一学员。

2. **公众号类型为「服务号」**（认证后）  
   → 才能较稳定地使用 **模板消息 API** 做业务提醒。  
   订阅号不适合每天 3 次提醒。

3. **用户关注公众号**（或完成小程序订阅授权）  
   → 未关注、未订阅的用户**不能**强推。

4. **在公众平台申请消息模板**  
   - 小程序：**功能 → 订阅消息**（选「学习/待办/日程」类模板）  
   - 服务号：**功能 → 模板消息**（选「学习提醒」「待办提醒」等）

---

## 一天发 3 次，具体怎么做？

### 方案 A（推荐）：服务号模板消息 + 定时任务

1. 学员**关注服务号**（菜单可跳转小程序）。
2. 服务端存：`unionid`、`mp_openid`（公众号 openid）、是否开启提醒。
3. 宝塔 / 服务器 **cron** 每天 3 次执行脚本，例如：

```bash
# 服务器 crontab（北京时间）
0 9 * * *  cd /www/wwwroot/jian/server && node src/jobs/send-reminders.js morning
0 14 * * * cd /www/wwwroot/jian/server && node src/jobs/send-reminders.js afternoon
0 21 * * * cd /www/wwwroot/jian/server && node src/jobs/send-reminders.js evening
```

4. 脚本逻辑：
   - 查「今日有未完成任务 + 已开启提醒 + 有 mp_openid」的学员
   - 调用微信接口发模板消息（文案区分早/午/晚）
   - 写发送日志，失败重试 / 告警

**优点**：同一用户每天 3 条，只要关注服务号且开启提醒即可，无需每天点 3 次订阅。  
**注意**：内容须是**学习/任务提醒**，勿发营销；建议仅对有未完成任务的用户发送。

### 方案 B：小程序订阅消息（补充）

适合未关注公众号、但用过小程序的用户：

1. 在「今日」页或登录后弹窗：`uni.requestSubscribeMessage`。
2. 申请 **3 个不同 template_id**（早/午/晚各一个，或同一模板 3 个实例）。
3. 用户每次授权 = 每个模板 1 次发送额度。
4. 定时任务发小程序订阅消息（用小程序 openid，接口不同）。

**缺点**：一次性订阅需**经常重新授权**；长期订阅需类目审核。  
**建议**：作为公众号通道的补充，不作为唯一通道。

### 方案 C：混合（本项目最终形态）

| 用户状态 | 9 / 14 / 21 点发送通道 |
|----------|------------------------|
| 已关注服务号 + 开启提醒 | 服务号模板消息 |
| 未关注，但小程序已订阅 | 小程序订阅消息 |
| 都未授权 | 不发（仅 App 内展示） |

---

## 微信接口要点

### 1. 获取 access_token（服务号）

```
GET https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=公众号APPID&secret=公众号SECRET
```

### 2. 发送服务号模板消息

```
POST https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=ACCESS_TOKEN
```

```json
{
  "touser": "公众号openid",
  "template_id": "模板ID",
  "url": "https://你的域名/admin",
  "miniprogram": {
    "appid": "小程序APPID",
    "pagepath": "pages/home/home"
  },
  "data": {
    "first": { "value": "上午好，今日还有学习任务待完成" },
    "keyword1": { "value": "数学 · 高数习题" },
    "keyword2": { "value": "2026-06-02" },
    "remark": { "value": "点击进入小程序记录学习" }
  }
}
```

字段名以你在公众平台选用的**模板字段**为准（可能是 thing1、date2 等新格式）。

### 3. 发送小程序订阅消息

```
POST https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=ACCESS_TOKEN
```

```json
{
  "touser": "小程序openid",
  "template_id": "模板ID",
  "page": "pages/plan/plan",
  "data": {
    "thing1": { "value": "今日还有3项任务未完成" },
    "date2": { "value": "2026-06-02 09:00" }
  }
}
```

---

## 数据库建议（后续开发）

```sql
-- 用户扩展
ALTER TABLE users ADD COLUMN unionid VARCHAR(64) NULL;
ALTER TABLE users ADD COLUMN mp_openid VARCHAR(64) NULL COMMENT '公众号openid';
ALTER TABLE users ADD COLUMN notify_enabled TINYINT(1) DEFAULT 1;

-- 小程序订阅额度（一次性订阅）
CREATE TABLE user_subscribe_quota (
  user_id INT NOT NULL,
  template_id VARCHAR(64) NOT NULL,
  quota INT NOT NULL DEFAULT 0,
  updated_at DATETIME,
  PRIMARY KEY (user_id, template_id)
);

-- 发送日志
CREATE TABLE notify_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  channel ENUM('mp_template','mini_subscribe'),
  slot ENUM('morning','afternoon','evening'),
  status ENUM('ok','fail'),
  err_msg VARCHAR(255),
  created_at DATETIME
);
```

---

## 小程序端需增加

1. **设置页开关**：「接收学习提醒（早9/下午2/晚9）」→ `PUT /me/notify-settings`
2. **订阅授权**（可选）：`requestSubscribeMessage` 上报服务端
3. **引导关注公众号**：展示服务号二维码 / 公众号组件（需配置）

---

## 服务端需增加

1. `.env` 增加：

```env
# 小程序（已有）
WX_APPID=
WX_SECRET=

# 服务号（新增）
WX_MP_APPID=
WX_MP_SECRET=

# 模板 ID（在公众平台复制）
WX_TMPL_MORNING=
WX_TMPL_AFTERNOON=
WX_TMPL_EVENING=
WX_MINI_TMPL_MORNING=
# ...
```

2. `wechatMp.js`：公众号 access_token、发模板消息  
3. `jobs/send-reminders.js`：按时段查任务、批量发送  
4. `unionid`：登录时 `code2Session` 已可返回 unionid（需绑定开放平台）

---

## 合规与体验建议

- 只对**当日有未完成任务**的用户发送，避免骚扰。
- 文案固定为学习提醒，不含营销、外链。
- 提供「关闭提醒」开关，关闭后 cron 跳过。
- 发送失败记日志，便于排查 openid 失效、模板下架等问题。

---

## 实施顺序建议

1. 确认公众号为**服务号**且与小程序**同主体绑定开放平台**  
2. 申请 3 个模板（或 1 个模板 + 不同时段文案）  
3. 服务端：unionid、mp_openid、定时任务、发模板消息  
4. 小程序：提醒开关 + 关注公众号引导  
5. 小程序订阅消息作为兜底（可选）

如需在本仓库直接落地代码（定时任务 + 发消息服务 + 数据库迁移），说明你的公众号类型（服务号/订阅号）和是否已绑定开放平台即可。
