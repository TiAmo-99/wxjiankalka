const nodemailer = require('nodemailer')
const config = require('../config')

let transporter = null

function isConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.mailFrom)
}

function getTransporter() {
  if (!isConfigured()) {
    const err = new Error('未配置邮件服务（SMTP_HOST / SMTP_USER / MAIL_FROM）')
    err.code = 50010
    throw err
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    })
  }
  return transporter
}

async function sendMail({ to, subject, text, html }) {
  if (!to) {
    const err = new Error('缺少收件邮箱')
    err.code = 10001
    throw err
  }
  const transport = getTransporter()
  return transport.sendMail({
    from: config.mailFrom,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, '<br/>')
  })
}

/** 发送失败不抛错，仅打日志（用于后台通知类邮件） */
async function sendMailSafe({ to, subject, text, html }) {
  if (!isConfigured()) {
    console.warn('[mail] SMTP 未配置，跳过:', subject)
    return false
  }
  try {
    await sendMail({ to, subject, text, html })
    return true
  } catch (e) {
    console.warn('[mail] 发送失败:', subject, e.message)
    return false
  }
}

module.exports = { sendMail, sendMailSafe, isConfigured }
