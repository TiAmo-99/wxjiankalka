const db = require('../db')
const { sign } = require('../utils/jwt')
const { code2Session } = require('./wechat')
const config = require('../config')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function mapUser(row) {
  if (!row) return null
  return {
    id: row.id,
    nickname: row.nickname,
    realName: row.real_name || '',
    phone: row.phone || '',
    avatarUrl: row.avatar_url || '',
    email: row.email || '',
    studyGoal: row.study_goal || '',
    motto: row.motto || '',
    emailNotifyEnabled: Boolean(row.email_notify_enabled),
    emailNotifyMode: row.email_notify_mode || 'default',
    emailSlotMorning: Boolean(row.email_slot_morning),
    emailSlotAfternoon: Boolean(row.email_slot_afternoon),
    emailSlotEvening: Boolean(row.email_slot_evening),
    emailNotifyWhenDone: Boolean(row.email_notify_when_done),
    permLevel: Number(row.perm_level) || 0,
    role: row.role,
    status: row.status
  }
}

function validatePhone(phone) {
  if (!phone || !/^1\d{10}$/.test(String(phone).trim())) {
    const err = new Error('请输入正确的11位手机号')
    err.code = 10001
    throw err
  }
}

function validateNickname(nickname) {
  const name = String(nickname || '').trim()
  if (name.length < 2 || name.length > 20) {
    const err = new Error('昵称长度为 2～20 个字符')
    err.code = 10001
    throw err
  }
  return name
}

function validateEmail(email, { required = false } = {}) {
  const v = String(email || '').trim()
  if (!v) {
    if (required) {
      const err = new Error('请填写邮箱')
      err.code = 10001
      throw err
    }
    return ''
  }
  if (!EMAIL_RE.test(v) || v.length > 255) {
    const err = new Error('邮箱格式不正确')
    err.code = 10001
    throw err
  }
  return v
}

async function issueToken(user) {
  const token = sign({ sub: user.id, role: user.role })
  return {
    token,
    nickname: user.nickname,
    user: mapUser(user)
  }
}

async function wxLogin(code) {
  if (!code) {
    const err = new Error('缺少 code')
    err.code = 10001
    throw err
  }

  const wx = await code2Session(code)
  const user = await db.get('SELECT * FROM users WHERE openid = ?', [wx.openid])

  if (!user) {
    const err = new Error('账号未注册，请先完成注册')
    err.code = 30001
    err.needRegister = true
    throw err
  }
  if (user.status !== 'active') {
    const err = new Error('账号已禁用')
    err.code = 30002
    throw err
  }

  return issueToken(user)
}

async function wxRegister(body) {
  if (!config.allowSelfRegister) {
    const err = new Error('暂未开放自助注册，请联系管理员')
    err.code = 30007
    throw err
  }

  const { code } = body || {}
  if (!code) {
    const err = new Error('缺少 code')
    err.code = 10001
    throw err
  }

  const nickname = validateNickname(body.nickname)
  const phone = String(body.phone || body.mobile || '').trim()
  validatePhone(phone)

  const realName = String(body.realName || body.real_name || '').trim().slice(0, 50)
  const avatarUrl = String(body.avatarUrl || body.avatar_url || '').trim().slice(0, 500)

  const wx = await code2Session(code)

  const exists = await db.get('SELECT id, status FROM users WHERE openid = ?', [wx.openid])
  if (exists) {
    if (exists.status === 'active') {
      const err = new Error('该微信已注册，请直接登录')
      err.code = 30005
      throw err
    }
    const err = new Error('账号已禁用')
    err.code = 30002
    throw err
  }

  const phoneUsed = await db.get(
    `SELECT id FROM users WHERE phone = ? AND role = 'student' LIMIT 1`,
    [phone]
  )
  if (phoneUsed) {
    const err = new Error('该手机号已被注册')
    err.code = 30006
    throw err
  }

  try {
    const result = await db.run(
      `INSERT INTO users (openid, nickname, real_name, phone, avatar_url, role, status)
       VALUES (?, ?, ?, ?, ?, 'student', 'active')`,
      [wx.openid, nickname, realName, phone, avatarUrl || null]
    )

    const user = await db.get('SELECT * FROM users WHERE id = ?', [result.insertId])
    return issueToken(user)
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      if (String(e.message).includes('phone')) {
        const err = new Error('该手机号已被注册')
        err.code = 30006
        throw err
      }
      if (String(e.message).includes('openid')) {
        const err = new Error('该微信已注册，请直接登录')
        err.code = 30005
        throw err
      }
    }
    throw e
  }
}

async function updateProfile(userId, body) {
  const fields = []
  const params = []

  if (body.nickname !== undefined) {
    fields.push('nickname = ?')
    params.push(validateNickname(body.nickname))
  }
  if (body.realName !== undefined || body.real_name !== undefined) {
    fields.push('real_name = ?')
    params.push(String(body.realName ?? body.real_name ?? '').trim().slice(0, 50))
  }
  if (body.avatarUrl !== undefined || body.avatar_url !== undefined) {
    fields.push('avatar_url = ?')
    params.push(String(body.avatarUrl ?? body.avatar_url ?? '').trim().slice(0, 500) || null)
  }
  if (body.phone !== undefined) {
    const phone = String(body.phone).trim()
    validatePhone(phone)
    const phoneUsed = await db.get(
      `SELECT id FROM users WHERE phone = ? AND role = 'student' AND id <> ? LIMIT 1`,
      [phone, userId]
    )
    if (phoneUsed) {
      const err = new Error('该手机号已被使用')
      err.code = 30006
      throw err
    }
    fields.push('phone = ?')
    params.push(phone)
  }
  if (body.email !== undefined) {
    fields.push('email = ?')
    params.push(validateEmail(body.email) || null)
  }
  if (body.studyGoal !== undefined || body.study_goal !== undefined) {
    fields.push('study_goal = ?')
    params.push(String(body.studyGoal ?? body.study_goal ?? '').trim().slice(0, 200))
  }
  if (body.motto !== undefined) {
    fields.push('motto = ?')
    params.push(String(body.motto).trim().slice(0, 200))
  }

  if (!fields.length) {
    const err = new Error('没有可更新的字段')
    err.code = 10001
    throw err
  }

  params.push(userId)
  await db.run(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params)

  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId])
  return mapUser(user)
}

async function updateEmailSettings(userId, body) {
  const user = await db.get('SELECT * FROM users WHERE id = ?', [userId])
  if (!user) {
    const err = new Error('用户不存在')
    err.code = 30004
    throw err
  }

  const enabled = Boolean(body.emailNotifyEnabled ?? body.email_notify_enabled)
  const email =
    body.email !== undefined
      ? validateEmail(body.email, { required: enabled })
      : String(user.email || '').trim()

  if (enabled && !email) {
    const err = new Error('开启邮件提醒前请先填写邮箱')
    err.code = 10001
    throw err
  }

  let mode = body.emailNotifyMode ?? body.email_notify_mode ?? user.email_notify_mode ?? 'default'
  if (mode !== 'default' && mode !== 'custom') mode = 'default'

  let slotMorning = 1
  let slotAfternoon = 1
  let slotEvening = 1

  if (mode === 'custom') {
    slotMorning = Boolean(body.emailSlotMorning ?? body.email_slot_morning) ? 1 : 0
    slotAfternoon = Boolean(body.emailSlotAfternoon ?? body.email_slot_afternoon) ? 1 : 0
    slotEvening = Boolean(body.emailSlotEvening ?? body.email_slot_evening) ? 1 : 0
    if (enabled && !slotMorning && !slotAfternoon && !slotEvening) {
      const err = new Error('请至少选择一个提醒时间')
      err.code = 10001
      throw err
    }
  }

  const whenDone = Boolean(body.emailNotifyWhenDone ?? body.email_notify_when_done) ? 1 : 0

  await db.run(
    `UPDATE users SET
      email = ?,
      email_notify_enabled = ?,
      email_notify_mode = ?,
      email_slot_morning = ?,
      email_slot_afternoon = ?,
      email_slot_evening = ?,
      email_notify_when_done = ?,
      updated_at = NOW()
     WHERE id = ?`,
    [email || null, enabled ? 1 : 0, mode, slotMorning, slotAfternoon, slotEvening, whenDone, userId]
  )

  const updated = await db.get('SELECT * FROM users WHERE id = ?', [userId])
  return mapUser(updated)
}

module.exports = { wxLogin, wxRegister, updateProfile, updateEmailSettings, mapUser }
