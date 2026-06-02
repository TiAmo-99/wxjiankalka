const db = require('../db')
const config = require('../config')
const mailService = require('./mailService')

const MIN_LEVEL = 0
const GRANT_MAX_LEVEL = 9
const FINAL_ADMIN_LEVEL = 10
const TOOLBOX_MIN_LEVEL = 3

function isFinalAdmin(permLevel) {
  return Number(permLevel) >= FINAL_ADMIN_LEVEL
}

/** 审核通过时可赋予的最高等级（不含 L10 最终管理员） */
function clampGrantLevel(level) {
  const n = Number(level)
  if (!Number.isFinite(n)) return MIN_LEVEL
  return Math.min(GRANT_MAX_LEVEL, Math.max(MIN_LEVEL, Math.floor(n)))
}

/** 存储在 users 表中的权限等级（含 L10） */
function clampLevel(level) {
  const n = Number(level)
  if (!Number.isFinite(n)) return MIN_LEVEL
  return Math.min(FINAL_ADMIN_LEVEL, Math.max(MIN_LEVEL, Math.floor(n)))
}

function canUseToolbox(permLevel) {
  return clampLevel(permLevel) > 2
}

function mapRequest(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    requestLevel: row.request_level,
    reason: row.reason || '',
    status: row.status,
    adminNote: row.admin_note || '',
    reviewedBy: row.reviewed_by || null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at).slice(0, 19).replace('T', ' ') : '',
    createdAt: row.created_at ? String(row.created_at).slice(0, 19).replace('T', ' ') : '',
    nickname: row.nickname || '',
    phone: row.phone || '',
    realName: row.real_name || '',
    currentPermLevel: row.current_perm_level ?? row.perm_level ?? 0
  }
}

async function createRequest(userId, body) {
  const requestLevel = clampLevel(body.requestLevel ?? body.request_level)
  const reason = String(body.reason || '').trim()

  if (requestLevel < 1) {
    const err = new Error('请选择申请权限等级')
    err.code = 10001
    throw err
  }
  if (reason.length < 5) {
    const err = new Error('申请原因至少 5 个字')
    err.code = 10001
    throw err
  }
  if (reason.length > 500) {
    const err = new Error('申请原因不超过 500 字')
    err.code = 10001
    throw err
  }

  const user = await db.get(
    `SELECT id, perm_level, nickname, real_name, phone FROM users WHERE id = ? AND role = 'student'`,
    [userId]
  )
  if (!user) {
    const err = new Error('用户不存在')
    err.code = 30004
    throw err
  }
  if (user.perm_level >= requestLevel) {
    const err = new Error('当前权限已不低于申请等级，无需重复申请')
    err.code = 10001
    throw err
  }

  const pending = await db.get(
    `SELECT id FROM permission_requests WHERE user_id = ? AND status = 'pending' LIMIT 1`,
    [userId]
  )
  if (pending) {
    const err = new Error('已有待审核的申请，请等待处理')
    err.code = 10001
    throw err
  }

  const result = await db.run(
    `INSERT INTO permission_requests (user_id, request_level, reason) VALUES (?, ?, ?)`,
    [userId, requestLevel, reason]
  )
  const row = await db.get(`SELECT * FROM permission_requests WHERE id = ?`, [result.insertId])
  const created = mapRequest(row)
  void notifyAdminNewPermissionRequest({
    request: created,
    user
  })
  return created
}

function formatUserLabel(user) {
  const name = String(user.real_name || user.nickname || '').trim() || `学员#${user.id}`
  const nick = String(user.nickname || '').trim()
  if (nick && nick !== name) return `${name}（昵称：${nick}）`
  return name
}

async function notifyAdminNewPermissionRequest({ request, user }) {
  const to = String(config.permNotifyEmail || '').trim()
  if (!to) return

  const adminLink = `${config.adminBaseUrl.replace(/\/$/, '')}/#/permission-requests`
  const label = formatUserLabel(user)
  const phone = String(user.phone || '').trim() || '未填写'
  const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })

  const subject = `[权限申请] ${label} 申请 L${request.requestLevel}`
  const text = [
    '有新的权限升级申请，请及时登录管理后台处理。',
    '',
    `申请编号：${request.id}`,
    `学员：${label}`,
    `用户 ID：${user.id}`,
    `手机：${phone}`,
    `当前权限：L${user.perm_level}`,
    `申请等级：L${request.requestLevel}`,
    `申请时间：${request.createdAt || now}`,
    '',
    '申请原因：',
    request.reason,
    '',
    `管理后台：${adminLink}`,
    '',
    '— 考研学习记录系统自动通知'
  ].join('\n')

  await mailService.sendMailSafe({ to, subject, text })
}

async function listMyRequests(userId) {
  const rows = await db.all(
    `SELECT * FROM permission_requests WHERE user_id = ? ORDER BY id DESC LIMIT 20`,
    [userId]
  )
  return rows.map(mapRequest)
}

async function listPendingForFinalAdmin(reviewerId, { page = 1, pageSize = 20 } = {}) {
  if (!isFinalAdmin((await db.get(`SELECT perm_level FROM users WHERE id = ?`, [reviewerId]))?.perm_level)) {
    const err = new Error('需要 L10 最终管理员权限')
    err.code = 20003
    throw err
  }

  const p = Math.max(1, Number(page) || 1)
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 50)
  const offset = (p - 1) * size

  const params = [reviewerId]
  const where = `WHERE pr.status = 'pending' AND pr.user_id <> ?`

  const totalRow = await db.get(
    `SELECT COUNT(*) AS c FROM permission_requests pr ${where}`,
    params
  )
  const rows = await db.all(
    `SELECT pr.*, u.nickname, u.phone, u.real_name, u.perm_level AS current_perm_level
     FROM permission_requests pr
     JOIN users u ON u.id = pr.user_id
     ${where}
     ORDER BY pr.id ASC
     LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  return {
    list: rows.map(mapRequest),
    total: Number(totalRow.c),
    page: p,
    pageSize: size
  }
}

async function reviewRequestAsFinalAdmin(reviewerId, requestId, body) {
  const reviewer = await db.get(`SELECT id, perm_level, role FROM users WHERE id = ?`, [reviewerId])
  if (!reviewer || reviewer.role !== 'student' || !isFinalAdmin(reviewer.perm_level)) {
    const err = new Error('需要 L10 最终管理员权限')
    err.code = 20003
    throw err
  }
  return reviewRequest(reviewerId, requestId, body)
}

async function listForAdmin({ status = '', page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize
  let where = `WHERE 1=1`
  const params = []

  if (status) {
    where += ` AND pr.status = ?`
    params.push(status)
  }

  const totalRow = await db.get(
    `SELECT COUNT(*) AS c FROM permission_requests pr ${where}`,
    params
  )
  const rows = await db.all(
    `SELECT pr.*, u.nickname, u.phone, u.real_name, u.perm_level AS current_perm_level
     FROM permission_requests pr
     JOIN users u ON u.id = pr.user_id
     ${where}
     ORDER BY pr.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    list: rows.map(mapRequest),
    total: totalRow.c,
    page,
    pageSize
  }
}

async function reviewRequest(adminId, requestId, body) {
  const action = body.action || body.status
  if (!['approve', 'approved', 'reject', 'rejected'].includes(action)) {
    const err = new Error('操作无效')
    err.code = 10001
    throw err
  }
  const approved = action === 'approve' || action === 'approved'

  const row = await db.get(
    `SELECT pr.*, u.perm_level AS current_perm_level
     FROM permission_requests pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.id = ?`,
    [requestId]
  )
  if (!row) {
    const err = new Error('申请不存在')
    err.code = 30004
    throw err
  }
  if (row.status !== 'pending') {
    const err = new Error('该申请已处理')
    err.code = 10001
    throw err
  }

  const adminNote = String(body.adminNote ?? body.admin_note ?? '').trim().slice(0, 255)
  let finalLevel = row.current_perm_level

  if (approved) {
    finalLevel = clampGrantLevel(body.permLevel ?? body.perm_level ?? row.request_level)
    await db.run(`UPDATE users SET perm_level = ?, updated_at = NOW() WHERE id = ?`, [
      finalLevel,
      row.user_id
    ])
  }

  await db.run(
    `UPDATE permission_requests SET
      status = ?,
      admin_note = ?,
      reviewed_by = ?,
      reviewed_at = NOW()
     WHERE id = ?`,
    [approved ? 'approved' : 'rejected', adminNote || null, adminId, requestId]
  )

  const updated = await db.get(
    `SELECT pr.*, u.nickname, u.phone, u.real_name, u.perm_level AS current_perm_level
     FROM permission_requests pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.id = ?`,
    [requestId]
  )
  return { request: mapRequest(updated), permLevel: finalLevel, approved }
}

async function updateUserPermLevel(userId, permLevel) {
  const row = await db.get(`SELECT id FROM users WHERE id = ? AND role = 'student'`, [userId])
  if (!row) {
    const err = new Error('学员不存在')
    err.code = 30004
    throw err
  }

  const level = clampLevel(permLevel)
  await db.run(`UPDATE users SET perm_level = ?, updated_at = NOW() WHERE id = ?`, [level, userId])
  const user = await db.get(
    `SELECT id, nickname, perm_level FROM users WHERE id = ? AND role = 'student'`,
    [userId]
  )
  return { id: user.id, nickname: user.nickname, permLevel: user.perm_level }
}

module.exports = {
  MIN_LEVEL,
  GRANT_MAX_LEVEL,
  FINAL_ADMIN_LEVEL,
  TOOLBOX_MIN_LEVEL,
  isFinalAdmin,
  clampLevel,
  clampGrantLevel,
  canUseToolbox,
  createRequest,
  listMyRequests,
  listPendingForFinalAdmin,
  listForAdmin,
  reviewRequest,
  reviewRequestAsFinalAdmin,
  updateUserPermLevel,
  mapRequest
}
