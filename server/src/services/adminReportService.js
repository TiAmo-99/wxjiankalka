const XLSX = require('xlsx')
const db = require('../db')

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

function formatDateTime(val) {
  if (!val) return ''
  if (val instanceof Date) {
    return val.toISOString().slice(0, 19).replace('T', ' ')
  }
  return String(val).slice(0, 19)
}

function mapReportRow(row) {
  const isOther = !row.plan_item_id
  const subject = isOther ? row.other_subject || '其他' : row.subject || ''
  const content = isOther ? row.other_content || '' : row.content || ''
  return {
    id: row.id,
    userId: row.user_id,
    nickname: row.nickname,
    realName: row.real_name || '',
    phone: row.phone || '',
    reportDate: formatDate(row.report_date),
    planDate: row.plan_item_date ? formatDate(row.plan_item_date) : formatDate(row.report_date),
    subject,
    content,
    targetMinutes: row.target_minutes ?? 0,
    completed: Boolean(row.completed),
    actualMinutes: row.actual_minutes,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    note: row.note || '',
    isOther,
    createdAt: formatDateTime(row.created_at)
  }
}

function buildWhere({ from, to, keyword }) {
  let sql = `WHERE u.role = 'student'`
  const params = []

  if (from) {
    sql += ` AND sr.report_date >= ?`
    params.push(from)
  }
  if (to) {
    sql += ` AND sr.report_date <= ?`
    params.push(to)
  }
  if (keyword) {
    const k = `%${keyword}%`
    sql += ` AND (u.nickname LIKE ? OR u.phone LIKE ? OR u.real_name LIKE ?)`
    params.push(k, k, k)
  }
  return { sql, params }
}

const LIST_SQL = `
  SELECT sr.*, u.nickname, u.real_name, u.phone,
         pi.subject, pi.content, pi.target_minutes, pi.date AS plan_item_date
  FROM study_reports sr
  INNER JOIN users u ON u.id = sr.user_id
  LEFT JOIN plan_items pi ON pi.id = sr.plan_item_id
`

async function listReports({ from, to, keyword = '', page = 1, pageSize = 20 } = {}) {
  const { sql: where, params } = buildWhere({ from, to, keyword })
  const offset = (page - 1) * pageSize

  const totalRow = await db.get(
    `SELECT COUNT(*) AS c FROM study_reports sr INNER JOIN users u ON u.id = sr.user_id ${where}`,
    params
  )

  const rows = await db.all(
    `${LIST_SQL} ${where} ORDER BY sr.report_date DESC, sr.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  return {
    list: rows.map(mapReportRow),
    total: totalRow.c,
    page,
    pageSize
  }
}

async function exportReports({ from, to, keyword = '' } = {}) {
  const { sql: where, params } = buildWhere({ from, to, keyword })
  const rows = await db.all(
    `${LIST_SQL} ${where} ORDER BY sr.report_date DESC, sr.id DESC LIMIT 10000`,
    params
  )
  return rows.map(mapReportRow)
}

function buildExportBuffer(reports) {
  const headers = [
    '上报ID',
    '上报日期',
    '学员昵称',
    '姓名',
    '科目',
    '任务/内容',
    '计划日期',
    '目标分钟',
    '是否完成',
    '实际分钟',
    '开始时间',
    '结束时间',
    '备注',
    '类型',
    '提交时间'
  ]

  const data = [
    headers,
    ...reports.map((r) => [
      r.id,
      r.reportDate,
      r.nickname,
      r.realName,
      r.subject,
      r.content,
      r.planDate,
      r.targetMinutes,
      r.completed ? '是' : '否',
      r.actualMinutes,
      r.startTime,
      r.endTime,
      r.note,
      r.isOther ? '其他学习' : '计划任务',
      r.createdAt
    ])
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), '学习上报')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = {
  listReports,
  exportReports,
  buildExportBuffer
}
