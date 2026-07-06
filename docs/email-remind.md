# 邮箱学习提醒

## 功能说明

- 学员在 **个人资料** 填写邮箱（选填）、学习目标、个签。
- 在 **我的 → 邮箱提醒设置** 配置：
  - 是否接收邮件
  - **默认时段**：每天 9:00、14:00、21:00
  - **仅指定时间**：自选 9 / 14 / 21 点
  - **全部完成时发送鼓励**（可选）
- 定时任务按时段扫描：有未完成任务 → 发提醒邮件；全部完成且开启鼓励 → 发鼓励邮件。

## 服务端配置（`.env`）

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的发信账号
SMTP_PASS=授权码或密码
MAIL_FROM=考研学习记录 <noreply@你的域名.com>

# 学员在小程序提交权限申请后，通知管理员（默认 jiankalka@qq.com）
PERM_NOTIFY_EMAIL=jiankalka@qq.com
ADMIN_BASE_URL=https://www.jiankalka.cn/manage
```

权限申请通知与学员学习提醒共用同一套 SMTP；未配置 SMTP 时申请仍可成功，仅跳过发信并在服务端日志提示。

## 数据库迁移

```bash
cd server
npm install
npm run db:migrate
```

## 定时任务（服务器 crontab，北京时间）

```bash
0 9 * * *  cd /www/wwwroot/你的路径/server && node src/jobs/send-email-reminders.js morning >> /tmp/email-remind.log 2>&1
0 14 * * * cd /www/wwwroot/你的路径/server && node src/jobs/send-email-reminders.js afternoon >> /tmp/email-remind.log 2>&1
0 21 * * * cd /www/wwwroot/你的路径/server && node src/jobs/send-email-reminders.js evening >> /tmp/email-remind.log 2>&1
```

手动测试：

```bash
node src/jobs/send-email-reminders.js morning
```

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/me` | 含邮箱与提醒设置字段 |
| PATCH | `/auth/me` | 更新昵称、手机、邮箱、学习目标、个签 |
| PATCH | `/auth/email-settings` | 更新邮箱与提醒开关、时段 |
| POST | `/admin/users/:id/email-reminder` | 管理员手动发送今日未完成任务提醒 |
