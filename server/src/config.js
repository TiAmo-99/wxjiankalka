const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env') })

module.exports = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'wxjiankalka',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'wxjiankalka'
  },
  wxAppId: process.env.WX_APPID || '',
  wxSecret: process.env.WX_SECRET || '',
  devOpenid: process.env.DEV_OPENID || 'dev_openid_demo',
  seedAdminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',
  allowSelfRegister: process.env.ALLOW_SELF_REGISTER !== 'false',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  mailFrom: process.env.MAIL_FROM || '',
  /** 学员提交权限申请时通知管理员 */
  permNotifyEmail: process.env.PERM_NOTIFY_EMAIL || 'jiankalka@qq.com',
  /** 网页管理后台根地址（静态页在 www，仅用于邮件/通知链接） */
  adminBaseUrl: process.env.ADMIN_BASE_URL || 'https://www.jiankalka.cn/manage'
}
