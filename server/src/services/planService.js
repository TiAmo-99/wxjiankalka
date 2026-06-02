const db = require('../db')
const { todayStr, weekRange } = require('../utils/dates')

function formatDate(val) {
  if (!val) return ''
  if (val instanceof Date) {
    const m = `${val.getMonth() + 1}`.padStart(2, '0')
    const d = `${val.getDate()}`.padStart(2, '0')
    return `${val.getFullYear()}-${m}-${d}`
  }
  return String(val).slice(0, 10)
}

function formatTime(val) {
  if (!val) return ''
  const s = val instanceof Date ? val.toTimeString().slice(0, 8) : String(val)
  return s.slice(0, 5)
}

function mapItem(row) {
  return {
    id: row.id,
    subject: row.subject,
    content: row.content,
    date: formatDate(row.date),
    targetMinutes: Number(row.target_minutes) || 0,
    reported: Boolean(row.reported),
    actualMinutes: row.actual_minutes || 0,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    note: row.note || ''
  }
}

const BASE_SQL = `
  SELECT pi.id, pi.date, pi.subject, pi.content, pi.target_minutes, pi.sort_order,
         CASE WHEN sr.id IS NOT NULL THEN 1 ELSE 0 END AS reported,
         sr.actual_minutes, sr.start_time, sr.end_time, sr.note
  FROM plan_items pi
  INNER JOIN study_plans sp ON sp.id = pi.plan_id
  LEFT JOIN study_reports sr ON sr.plan_item_id = pi.id AND sr.user_id = sp.user_id AND sr.report_date = pi.date
  WHERE sp.user_id = ? AND sp.start_date <= pi.date AND sp.end_date >= pi.date
`

async function listByUser(userId, { from, to } = {}) {
  let sql = BASE_SQL
  const params = [userId]
  if (from && to) {
    sql += ' AND pi.date >= ? AND pi.date <= ?'
    params.push(from, to)
  } else if (from) {
    sql += ' AND pi.date = ?'
    params.push(from)
  }
  sql += ' ORDER BY pi.date ASC, pi.sort_order ASC, pi.id ASC'
  const rows = await db.all(sql, params)
  return rows.map(mapItem)
}

async function listToday(userId) {
  return listByUser(userId, { from: todayStr() })
}

async function listWeek(userId) {
  const { start, end } = weekRange()
  return listByUser(userId, { from: start, to: end })
}

async function listAll(userId) {
  return listByUser(userId)
}

async function listDay(userId, date) {
  return listByUser(userId, { from: date })
}

function pad(n) {
  return `${n}`.padStart(2, '0')
}

async function ensureStudentPlanForDate(userId, date) {
  let plan = await db.get(
    `SELECT * FROM study_plans WHERE user_id = ? AND start_date <= ? AND end_date >= ?
     ORDER BY id DESC LIMIT 1`,
    [userId, date, date]
  )
  if (plan) return plan.id

  const [y, m] = date.split('-').map(Number)
  const startDate = `${y}-${pad(m)}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const endDate = `${y}-${pad(m)}-${pad(lastDay)}`

  const result = await db.run(
    `INSERT INTO study_plans (user_id, title, start_date, end_date, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, `${y}年${m}月学习计划`, startDate, endDate, userId]
  )
  return result.insertId
}

/** 学员自建任务（今日及以后） */
async function createStudentPlanItem(userId, body) {
  const date = formatDate(body.date || todayStr())
  const today = todayStr()
  if (date < today) {
    const err = new Error('只能选择今天及以后的日期')
    err.code = 10001
    throw err
  }

  const subject = String(body.subject || '').trim().slice(0, 100)
  const content = String(body.content || '').trim().slice(0, 500)
  if (!subject || !content) {
    const err = new Error('请填写科目与学习内容')
    err.code = 10001
    throw err
  }

  const targetMinutes = Math.max(0, Number(body.targetMinutes ?? body.target_minutes ?? 0) || 0)
  const planId = await ensureStudentPlanForDate(userId, date)

  const sortRow = await db.get(
    `SELECT COALESCE(MAX(sort_order), -1) AS max_sort FROM plan_items WHERE plan_id = ? AND date = ?`,
    [planId, date]
  )
  const sortOrder = (sortRow?.max_sort ?? -1) + 1

  const result = await db.run(
    `INSERT INTO plan_items (plan_id, date, subject, content, target_minutes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [planId, date, subject, content, targetMinutes, sortOrder]
  )

  const row = await db.get(
    `SELECT pi.id, pi.date, pi.subject, pi.content, pi.target_minutes, pi.sort_order,
            0 AS reported, 0 AS actual_minutes, NULL AS start_time, NULL AS end_time, NULL AS note
     FROM plan_items pi WHERE pi.id = ?`,
    [result.insertId]
  )
  return mapItem(row)
}

module.exports = {
  listToday,
  listWeek,
  listAll,
  listDay,
  mapItem,
  createStudentPlanItem
}
