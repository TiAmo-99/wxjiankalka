const db = require('../db')
const { todayStr } = require('../utils/dates')

function formatDate(val) {
  if (!val) return ''
  if (val instanceof Date) {
    const m = `${val.getMonth() + 1}`.padStart(2, '0')
    const d = `${val.getDate()}`.padStart(2, '0')
    return `${val.getFullYear()}-${m}-${d}`
  }
  return String(val).slice(0, 10)
}

function mapStudent(row) {
  return {
    id: row.id,
    nickname: row.nickname,
    realName: row.real_name || '',
    phone: row.phone || '',
    email: row.email || '',
    permLevel: Number(row.perm_level) || 0,
    status: row.status,
    hasWechat: Boolean(row.openid),
    openidBound: Boolean(row.openid),
    createdAt: formatDate(row.created_at)
  }
}

function mapPlan(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    createdAt: formatDate(row.created_at)
  }
}

function mapPlanItem(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    userId: row.user_id,
    date: formatDate(row.date),
    subject: row.subject,
    content: row.content,
    targetMinutes: row.target_minutes,
    sortOrder: row.sort_order,
    reported: Boolean(row.reported),
    actualMinutes: row.actual_minutes || 0
  }
}

async function listStudents({ page = 1, pageSize = 20, keyword = '', status = '' } = {}) {
  const offset = (page - 1) * pageSize
  let where = `WHERE role = 'student'`
  const params = []

  if (keyword) {
    where += ` AND (nickname LIKE ? OR phone LIKE ? OR real_name LIKE ?)`
    const k = `%${keyword}%`
    params.push(k, k, k)
  }
  if (status) {
    where += ` AND status = ?`
    params.push(status)
  }

  const totalRow = await db.get(`SELECT COUNT(*) AS c FROM users ${where}`, params)
  const rows = await db.all(
    `SELECT id, nickname, real_name, phone, email, perm_level, openid, status, created_at
     FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    list: rows.map(mapStudent),
    total: totalRow.c,
    page,
    pageSize
  }
}

async function getStudent(id) {
  const row = await db.get(
    `SELECT id, nickname, real_name, phone, email, perm_level, openid, status, created_at FROM users WHERE id = ? AND role = 'student'`,
    [id]
  )
  if (!row) {
    const err = new Error('学员不存在')
    err.code = 30004
    throw err
  }
  return mapStudent(row)
}

async function updateStudent(id, body) {
  await getStudent(id)
  const fields = []
  const params = []

  if (body.nickname !== undefined) {
    fields.push('nickname = ?')
    params.push(String(body.nickname).trim().slice(0, 100))
  }
  if (body.realName !== undefined || body.real_name !== undefined) {
    fields.push('real_name = ?')
    params.push(String(body.realName ?? body.real_name ?? '').trim().slice(0, 50))
  }
  if (body.phone !== undefined) {
    const phone = String(body.phone).trim()
    if (phone && !/^1\d{10}$/.test(phone)) {
      const err = new Error('手机号格式不正确')
      err.code = 10001
      throw err
    }
    if (phone) {
      const used = await db.get(
        `SELECT id FROM users WHERE phone = ? AND role = 'student' AND id <> ?`,
        [phone, id]
      )
      if (used) {
        const err = new Error('手机号已被使用')
        err.code = 30006
        throw err
      }
    }
    fields.push('phone = ?')
    params.push(phone || null)
  }
  if (body.status !== undefined) {
    if (!['active', 'disabled'].includes(body.status)) {
      const err = new Error('状态无效')
      err.code = 10001
      throw err
    }
    fields.push('status = ?')
    params.push(body.status)
  }

  if (!fields.length) {
    const err = new Error('没有可更新字段')
    err.code = 10001
    throw err
  }

  params.push(id)
  await db.run(`UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params)
  return getStudent(id)
}

async function ensurePlanForDate(userId, date, adminId) {
  let plan = await db.get(
    `SELECT * FROM study_plans WHERE user_id = ? AND start_date <= ? AND end_date >= ? ORDER BY id DESC LIMIT 1`,
    [userId, date, date]
  )

  if (plan) return plan.id

  const [y, m] = date.split('-').map(Number)
  const startDate = `${y}-${`${m}`.padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${y}-${`${m}`.padStart(2, '0')}-${`${lastDay}`.padStart(2, '0')}`

  const result = await db.run(
    `INSERT INTO study_plans (user_id, title, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, `${y}年${m}月学习计划`, startDate, endDate, adminId]
  )
  return result.insertId
}

async function listPlans(userId) {
  await getStudent(userId)
  const rows = await db.all(
    `SELECT * FROM study_plans WHERE user_id = ? ORDER BY start_date DESC`,
    [userId]
  )
  return rows.map(mapPlan)
}

async function createPlan(adminId, body) {
  const userId = body.userId ?? body.user_id
  if (!userId) {
    const err = new Error('请指定学员')
    err.code = 10001
    throw err
  }
  await getStudent(userId)

  const title = String(body.title || '学习计划').trim().slice(0, 200)
  const startDate = body.startDate || body.start_date
  const endDate = body.endDate || body.end_date
  if (!startDate || !endDate) {
    const err = new Error('请填写开始和结束日期')
    err.code = 10001
    throw err
  }

  const result = await db.run(
    `INSERT INTO study_plans (user_id, title, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, title, startDate, endDate, adminId]
  )
  const row = await db.get(`SELECT * FROM study_plans WHERE id = ?`, [result.insertId])
  return mapPlan(row)
}

async function listPlanItems({ userId, from, to, planId } = {}) {
  if (!userId) {
    const err = new Error('请指定学员')
    err.code = 10001
    throw err
  }
  await getStudent(userId)

  let sql = `
    SELECT pi.*, sp.user_id,
           CASE WHEN sr.id IS NOT NULL THEN 1 ELSE 0 END AS reported,
           sr.actual_minutes
    FROM plan_items pi
    INNER JOIN study_plans sp ON sp.id = pi.plan_id
    LEFT JOIN study_reports sr ON sr.plan_item_id = pi.id AND sr.user_id = sp.user_id AND sr.report_date = pi.date
    WHERE sp.user_id = ?
  `
  const params = [userId]

  if (planId) {
    sql += ' AND pi.plan_id = ?'
    params.push(planId)
  }
  if (from && to) {
    sql += ' AND pi.date >= ? AND pi.date <= ?'
    params.push(from, to)
  } else if (from) {
    sql += ' AND pi.date = ?'
    params.push(from)
  }

  sql += ' ORDER BY pi.date ASC, pi.sort_order ASC, pi.id ASC'
  const rows = await db.all(sql, params)
  return rows.map(mapPlanItem)
}

async function createPlanItem(adminId, body) {
  const userId = body.userId ?? body.user_id
  const date = body.date || todayStr()
  if (!userId) {
    const err = new Error('请指定学员')
    err.code = 10001
    throw err
  }

  const subject = String(body.subject || '').trim()
  const content = String(body.content || '').trim()
  if (!subject || !content) {
    const err = new Error('请填写科目和任务内容')
    err.code = 10001
    throw err
  }

  const planId = body.planId ?? body.plan_id ?? (await ensurePlanForDate(userId, date, adminId))
  const plan = await db.get(`SELECT * FROM study_plans WHERE id = ? AND user_id = ?`, [planId, userId])
  if (!plan) {
    const err = new Error('计划不存在')
    err.code = 30004
    throw err
  }
  if (date < formatDate(plan.start_date) || date > formatDate(plan.end_date)) {
    const err = new Error('任务日期不在计划有效期内')
    err.code = 10001
    throw err
  }

  const sortOrder = Number(body.sortOrder ?? body.sort_order ?? 0)
  const targetMinutes = Number(body.targetMinutes ?? body.target_minutes ?? 0)

  const result = await db.run(
    `INSERT INTO plan_items (plan_id, date, subject, content, target_minutes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [planId, date, subject, content, targetMinutes, sortOrder]
  )

  const inserted = await db.get(
    `SELECT pi.*, sp.user_id, 0 AS reported, 0 AS actual_minutes
     FROM plan_items pi INNER JOIN study_plans sp ON sp.id = pi.plan_id WHERE pi.id = ?`,
    [result.insertId]
  )
  return mapPlanItem(inserted)
}

async function updatePlanItem(id, body) {
  const row = await db.get(
    `SELECT pi.*, sp.user_id FROM plan_items pi
     INNER JOIN study_plans sp ON sp.id = pi.plan_id WHERE pi.id = ?`,
    [id]
  )
  if (!row) {
    const err = new Error('计划任务不存在')
    err.code = 30004
    throw err
  }

  const fields = []
  const params = []

  if (body.date !== undefined) {
    fields.push('date = ?')
    params.push(body.date)
  }
  if (body.subject !== undefined) {
    fields.push('subject = ?')
    params.push(String(body.subject).trim().slice(0, 100))
  }
  if (body.content !== undefined) {
    fields.push('content = ?')
    params.push(String(body.content).trim().slice(0, 500))
  }
  if (body.targetMinutes !== undefined || body.target_minutes !== undefined) {
    fields.push('target_minutes = ?')
    params.push(Number(body.targetMinutes ?? body.target_minutes ?? 0))
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    fields.push('sort_order = ?')
    params.push(Number(body.sortOrder ?? body.sort_order ?? 0))
  }

  if (!fields.length) {
    const err = new Error('没有可更新字段')
    err.code = 10001
    throw err
  }

  params.push(id)
  await db.run(`UPDATE plan_items SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params)

  const items = await listPlanItems({ userId: row.user_id, from: body.date || formatDate(row.date), to: body.date || formatDate(row.date) })
  return items.find((i) => i.id === id) || mapPlanItem(row)
}

async function deletePlanItem(id) {
  const row = await db.get(`SELECT id FROM plan_items WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('计划任务不存在')
    err.code = 30004
    throw err
  }
  await db.run(`DELETE FROM plan_items WHERE id = ?`, [id])
  return { ok: true }
}

async function getUserStats(userId) {
  await getStudent(userId)
  const total = await db.get(
    `SELECT COALESCE(SUM(actual_minutes), 0) AS m, COUNT(*) AS reports,
            SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS done
     FROM study_reports WHERE user_id = ?`,
    [userId]
  )
  const items = await db.get(
    `SELECT COUNT(*) AS c FROM plan_items pi
     INNER JOIN study_plans sp ON sp.id = pi.plan_id WHERE sp.user_id = ?`,
    [userId]
  )
  const days = await db.get(
    `SELECT COUNT(DISTINCT report_date) AS c FROM study_reports WHERE user_id = ?`,
    [userId]
  )

  return {
    totalMinutes: total.m,
    reportCount: total.reports,
    completedReports: total.done,
    planItemCount: items.c,
    streakDays: days.c
  }
}

module.exports = {
  listStudents,
  getStudent,
  updateStudent,
  listPlans,
  createPlan,
  listPlanItems,
  createPlanItem,
  updatePlanItem,
  deletePlanItem,
  getUserStats
}
