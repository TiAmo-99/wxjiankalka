const db = require('../db')
const { todayStr, isToday, weekRange } = require('../utils/dates')

function formatTime(val) {
  if (!val) return ''
  const s = val instanceof Date ? val.toTimeString().slice(0, 8) : String(val)
  return s.slice(0, 5)
}

function formatDate(val) {
  if (!val) return ''
  if (val instanceof Date) {
    const m = `${val.getMonth() + 1}`.padStart(2, '0')
    const d = `${val.getDate()}`.padStart(2, '0')
    return `${val.getFullYear()}-${m}-${d}`
  }
  return String(val).slice(0, 10)
}

function mapReport(row) {
  if (!row) return null
  return {
    id: row.id,
    planItemId: row.plan_item_id,
    reportDate: formatDate(row.report_date),
    completed: Boolean(row.completed),
    actualMinutes: row.actual_minutes,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    note: row.note || '',
    otherSubject: row.other_subject || '',
    otherContent: row.other_content || ''
  }
}

async function upsertReport(userId, body) {
  const reportDate = body.reportDate || body.report_date || todayStr()
  if (!isToday(reportDate)) {
    const err = new Error('仅可记录今日学习')
    err.statusCode = 403
    err.code = 30003
    throw err
  }

  const isOther = Boolean(body.isOther)
  const planItemId = isOther ? null : body.planItemId ?? body.plan_item_id ?? null

  if (!isOther && planItemId) {
    const item = await db.get(
      `SELECT pi.id FROM plan_items pi
       INNER JOIN study_plans sp ON sp.id = pi.plan_id
       WHERE pi.id = ? AND sp.user_id = ?`,
      [planItemId, userId]
    )
    if (!item) {
      const err = new Error('计划任务不存在')
      err.code = 30004
      throw err
    }
  }

  const payload = {
    completed: body.completed ? 1 : 0,
    actual_minutes: Number(body.actualMinutes ?? body.actual_minutes ?? 0),
    start_time: body.startTime || body.start_time || null,
    end_time: body.endTime || body.end_time || null,
    note: body.note || null,
    other_subject: isOther ? body.otherSubject || body.other_subject || null : null,
    other_content: isOther ? body.otherContent || body.other_content || null : null
  }

  let existing = null
  if (planItemId) {
    existing = await db.get(
      `SELECT * FROM study_reports WHERE user_id = ? AND plan_item_id = ? AND report_date = ?`,
      [userId, planItemId, reportDate]
    )
  } else if (isOther) {
    existing = await db.get(
      `SELECT * FROM study_reports WHERE user_id = ? AND plan_item_id IS NULL AND report_date = ?
       AND other_subject IS NOT NULL LIMIT 1`,
      [userId, reportDate]
    )
  }

  if (existing) {
    await db.run(
      `UPDATE study_reports SET completed=?, actual_minutes=?, start_time=?, end_time=?, note=?,
       other_subject=?, other_content=?, updated_at=NOW() WHERE id=?`,
      [
        payload.completed,
        payload.actual_minutes,
        payload.start_time,
        payload.end_time,
        payload.note,
        payload.other_subject,
        payload.other_content,
        existing.id
      ]
    )
    const row = await db.get('SELECT * FROM study_reports WHERE id = ?', [existing.id])
    return mapReport(row)
  }

  const result = await db.run(
    `INSERT INTO study_reports (user_id, plan_item_id, report_date, completed, actual_minutes, start_time, end_time, note, other_subject, other_content)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      planItemId,
      reportDate,
      payload.completed,
      payload.actual_minutes,
      payload.start_time,
      payload.end_time,
      payload.note,
      payload.other_subject,
      payload.other_content
    ]
  )

  const row = await db.get('SELECT * FROM study_reports WHERE id = ?', [result.insertId])
  return mapReport(row)
}

async function listTodayReports(userId) {
  const rows = await db.all(
    'SELECT * FROM study_reports WHERE user_id = ? AND report_date = ? ORDER BY id DESC',
    [userId, todayStr()]
  )
  return rows.map(mapReport)
}

function mapReportListItem(row) {
  const isOther = !row.plan_item_id
  return {
    ...mapReport(row),
    subject: isOther ? row.other_subject || '其他学习' : row.subject || '未命名科目',
    content: isOther ? row.other_content || '' : row.content || '',
    isOther
  }
}

/** 学员学习记录列表（默认近 30 天） */
async function listReports(userId, { from, to, page = 1, pageSize = 30 } = {}) {
  const end = to || todayStr()
  let start = from
  if (!start) {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    start = formatDate(d)
  }

  const limit = Math.min(Math.max(Number(pageSize) || 30, 1), 100)
  const pageNum = Math.max(Number(page) || 1, 1)
  const offset = (pageNum - 1) * limit

  const rows = await db.all(
    `SELECT sr.*, pi.subject, pi.content, pi.date AS plan_item_date
     FROM study_reports sr
     LEFT JOIN plan_items pi ON pi.id = sr.plan_item_id
     WHERE sr.user_id = ? AND sr.report_date >= ? AND sr.report_date <= ?
     ORDER BY sr.report_date DESC, sr.id DESC
     LIMIT ? OFFSET ?`,
    [userId, start, end, limit, offset]
  )

  const totalRow = await db.get(
    `SELECT COUNT(*) AS c FROM study_reports
     WHERE user_id = ? AND report_date >= ? AND report_date <= ?`,
    [userId, start, end]
  )

  return {
    list: rows.map(mapReportListItem),
    total: totalRow?.c ?? 0,
    page: pageNum,
    pageSize: limit,
    from: start,
    to: end
  }
}

async function getSummary(userId) {
  const total = await db.get(
    'SELECT COALESCE(SUM(actual_minutes), 0) AS m FROM study_reports WHERE user_id = ?',
    [userId]
  )
  const { start, end } = weekRange()
  const week = await db.get(
    `SELECT COALESCE(SUM(actual_minutes), 0) AS m FROM study_reports
     WHERE user_id = ? AND report_date >= ? AND report_date <= ?`,
    [userId, start, end]
  )
  const completedTasks = await db.get(
    'SELECT COUNT(*) AS c FROM study_reports WHERE user_id = ? AND completed = 1',
    [userId]
  )
  const streakDays = await db.get(
    'SELECT COUNT(DISTINCT report_date) AS c FROM study_reports WHERE user_id = ?',
    [userId]
  )
  const todayRow = await db.get(
    `SELECT COALESCE(SUM(actual_minutes), 0) AS m FROM study_reports
     WHERE user_id = ? AND report_date = ?`,
    [userId, todayStr()]
  )

  return {
    totalMinutes: total.m,
    weekMinutes: week.m,
    todayMinutes: todayRow.m,
    completedTasks: completedTasks.c,
    streakDays: streakDays.c
  }
}

module.exports = { upsertReport, listTodayReports, listReports, getSummary, mapReport }
