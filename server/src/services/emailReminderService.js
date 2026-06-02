const db = require('../db')
const planService = require('./planService')
const encouragementService = require('./encouragementService')
const mailService = require('./mailService')
const { todayStr } = require('../utils/dates')

const SLOT_META = {
  morning: { hour: 9, label: '上午', greet: '早上好' },
  afternoon: { hour: 14, label: '下午', greet: '下午好' },
  evening: { hour: 21, label: '晚上', greet: '晚上好' }
}

function slotEnabled(user, slot) {
  if (!user.email_notify_enabled || !user.email) return false
  if (user.email_notify_mode === 'default') return true
  if (slot === 'morning') return Boolean(user.email_slot_morning)
  if (slot === 'afternoon') return Boolean(user.email_slot_afternoon)
  if (slot === 'evening') return Boolean(user.email_slot_evening)
  return false
}

function isTaskDone(item) {
  return Boolean(item.reported)
}

async function getTodayTasks(userId) {
  return planService.listToday(userId)
}

async function pickEncouragement() {
  try {
    const row = await encouragementService.getRandom()
    return row?.content || '坚持就是胜利，加油！'
  } catch (e) {
    return '坚持就是胜利，加油！'
  }
}

function pickSlotByHour() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function buildRemindMail({ user, slot, pendingTasks, manual = false }) {
  const meta = SLOT_META[slot] || SLOT_META.morning
  const date = todayStr()
  const lines = pendingTasks.map((t, i) => `${i + 1}. 【${t.subject}】${t.content}`)
  const goal = user.study_goal ? `\n学习目标：${user.study_goal}` : ''
  const motto = user.motto ? `\n「${user.motto}」` : ''

  const subject = `【学习提醒】还有 ${pendingTasks.length} 项今日任务待完成`
  const text = [
    `${user.nickname || '同学'}，${meta.greet}！`,
    ``,
    `今天是 ${date}，你还有 ${pendingTasks.length} 项学习任务尚未完成：`,
    ...lines,
    goal,
    motto,
    ``,
    `请打开微信小程序「考研学习记录」，在「计划」中记录学习进度。`,
    ``,
    manual
      ? `— 本邮件由老师通过管理后台手动发送。`
      : `— 本邮件由系统自动发送，可在「我的 → 邮箱提醒设置」中关闭。`
  ]
    .filter((x) => x !== undefined)
    .join('\n')

  return { subject, text }
}

async function buildEncourageMail({ user, slot }) {
  const meta = SLOT_META[slot]
  const date = todayStr()
  const q = await pickEncouragement()
  const subject = `【学习鼓励】今日任务已全部完成`
  const text = [
    `${user.nickname || '同学'}，${meta.greet}！`,
    ``,
    `${date} 的学习计划已全部完成，太棒了！`,
    user.study_goal ? `学习目标：${user.study_goal}` : '',
    user.motto ? `「${user.motto}」` : '',
    ``,
    `今日一句：${q}`,
    ``,
    `适当休息，明天继续加油。`,
    ``,
    `— 本邮件由系统自动发送，可在「我的 → 邮箱提醒设置」中关闭。`
  ]
    .filter(Boolean)
    .join('\n')
  return { subject, text }
}

async function logSend(userId, slot, kind, status, errMsg = null) {
  await db.run(
    `INSERT INTO email_notify_logs (user_id, slot, kind, status, err_msg) VALUES (?, ?, ?, ?, ?)`,
    [userId, slot, kind, status, errMsg]
  )
}

async function sendForUser(user, slot) {
  if (!slotEnabled(user, slot)) return { skipped: true, reason: 'slot_disabled' }

  const tasks = await getTodayTasks(user.id)
  const pending = tasks.filter((t) => !isTaskDone(t))
  const allDone = tasks.length > 0 && pending.length === 0

  try {
    if (pending.length > 0) {
      const { subject, text } = buildRemindMail({ user, slot, pendingTasks: pending })
      await mailService.sendMail({ to: user.email, subject, text })
      await logSend(user.id, slot, 'remind', 'ok')
      return { sent: true, kind: 'remind' }
    }

    if (allDone && user.email_notify_when_done) {
      const { subject, text } = await buildEncourageMail({ user, slot })
      await mailService.sendMail({ to: user.email, subject, text })
      await logSend(user.id, slot, 'encourage', 'ok')
      return { sent: true, kind: 'encourage' }
    }

    return { skipped: true, reason: 'nothing_to_send' }
  } catch (e) {
    await logSend(user.id, slot, pending.length ? 'remind' : 'encourage', 'fail', String(e.message).slice(0, 250))
    return { sent: false, error: e.message }
  }
}

async function runSlot(slot) {
  if (!SLOT_META[slot]) {
    throw new Error('slot 须为 morning | afternoon | evening')
  }
  if (!mailService.isConfigured()) {
    console.warn('[email-reminder] SMTP 未配置，跳过发送')
    return { total: 0, sent: 0, skipped: 0, failed: 0 }
  }

  const users = await db.all(
    `SELECT * FROM users WHERE role = 'student' AND status = 'active'
     AND email_notify_enabled = 1 AND email IS NOT NULL AND email <> ''`
  )

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const user of users) {
    const result = await sendForUser(user, slot)
    if (result.sent) sent++
    else if (result.error) failed++
    else skipped++
  }

  return { total: users.length, sent, skipped, failed, slot, at: new Date().toISOString() }
}

async function sendManualReminder(userId) {
  if (!mailService.isConfigured()) {
    const err = new Error('未配置邮件服务（SMTP_HOST / SMTP_USER / MAIL_FROM）')
    err.code = 50010
    throw err
  }

  const user = await db.get(`SELECT * FROM users WHERE id = ? AND role = 'student'`, [userId])
  if (!user) {
    const err = new Error('学员不存在')
    err.code = 30004
    throw err
  }
  if (!user.email || !String(user.email).trim()) {
    const err = new Error('该学员未填写邮箱，请先在小程序个人资料中填写')
    err.code = 10001
    throw err
  }

  const tasks = await getTodayTasks(userId)
  const pending = tasks.filter((t) => !isTaskDone(t))
  if (pending.length === 0) {
    const err = new Error('今日无未完成任务，无需发送提醒')
    err.code = 10001
    throw err
  }

  const slot = pickSlotByHour()
  try {
    const { subject, text } = buildRemindMail({ user, slot, pendingTasks: pending, manual: true })
    await mailService.sendMail({ to: user.email.trim(), subject, text })
    await logSend(user.id, 'manual', 'remind', 'ok')
    return {
      sent: true,
      email: user.email.trim(),
      pendingCount: pending.length,
      pending: pending.map((t) => ({ subject: t.subject, content: t.content }))
    }
  } catch (e) {
    await logSend(user.id, 'manual', 'remind', 'fail', String(e.message).slice(0, 250))
    throw e
  }
}

module.exports = { runSlot, sendManualReminder, slotEnabled, SLOT_META }
