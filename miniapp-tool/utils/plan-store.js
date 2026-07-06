/** 计划/上报共享状态（单文件，避免小程序分包漏编） */

const REPORTED_KEY = 'local_reported_ids'
const OVER_KEY = 'local_over_days'

export function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function pickTargetMinutes(row) {
  if (!row || typeof row !== 'object') return 0
  const raw =
    row.targetMinutes ??
    row.target_minutes ??
    row.targetMinute ??
    row.target_minute ??
    row.planTargetMinutes
  if (raw === '' || raw == null) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0
}

/** 列表/详情展示用 */
export function formatTargetMinutes(minutes) {
  const n = pickTargetMinutes({ targetMinutes: minutes })
  return n > 0 ? String(n) : '未设置'
}

export function normalizePlanRow(row) {
  return {
    id: row.id,
    subject: row.subject || '未命名科目',
    content: row.content || '',
    date: row.date || todayStr(),
    targetMinutes: pickTargetMinutes(row),
    actualMinutes: row.actualMinutes ?? row.actual_minutes ?? 0,
    reported: Boolean(row.reported),
    startTime: row.startTime ?? row.start_time ?? '',
    endTime: row.endTime ?? row.end_time ?? '',
    note: row.note ?? ''
  }
}

const META_KEY = 'local_report_meta'

/** @deprecated 完成态以接口 reported 为准，仅保留读取兼容 */
export function getReportMetaMap() {
  return uni.getStorageSync(META_KEY) || {}
}

/** @deprecated */
export function getReportMeta(planItemId) {
  return getReportMetaMap()[planItemId] || {}
}

/** @deprecated 上报成功后请刷新计划列表，勿再依赖本地缓存 */
export function setReportMeta(planItemId, meta) {
  const map = getReportMetaMap()
  map[planItemId] = { ...map[planItemId], ...meta }
  uni.setStorageSync(META_KEY, map)
}

/** 合并任务与接口返回的上报详情 */
export function getTaskDisplay(item) {
  if (!item) return {}
  return {
    ...item,
    reported: Boolean(item.reported),
    actualMinutes: Number(item.actualMinutes) || 0,
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    note: item.note || ''
  }
}

export function minutesBetweenTimes(start, end) {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let diff = eh * 60 + em - (sh * 60 + sm)
  if (diff < 0) diff += 24 * 60
  return diff
}

/** @deprecated */
export function getReportedIds() {
  return uni.getStorageSync(REPORTED_KEY) || []
}

/** @deprecated */
export function addReportedId(id) {
  const ids = getReportedIds()
  if (!ids.includes(id)) {
    uni.setStorageSync(REPORTED_KEY, [...ids, id])
  }
}

/** @deprecated */
export function getOverDays() {
  return uni.getStorageSync(OVER_KEY) || []
}

/** @deprecated */
export function markDayOver(date) {
  const days = getOverDays()
  if (!days.includes(date)) {
    uni.setStorageSync(OVER_KEY, [...days, date])
  }
}

/** 是否已上报/完成（以服务端 reported 为准） */
export function isPlanItemDone(item) {
  if (!item) return false
  return Boolean(item.reported)
}

/**
 * 某日完成态：none | pending | done | over
 */
export function getDayStatus(date, items) {
  const dayItems = items.filter((i) => i.date === date)
  if (dayItems.length === 0) return 'none'
  const doneCount = dayItems.filter((i) => i.reported).length
  if (doneCount === 0) return 'pending'
  if (doneCount < dayItems.length) return 'pending'
  const targetSum = dayItems.reduce((s, i) => s + (i.targetMinutes || 0), 0)
  const actualSum = dayItems.reduce((s, i) => s + (Number(i.actualMinutes) || 0), 0)
  if (targetSum > 0 && actualSum > targetSum) return 'over'
  return 'done'
}

/** 本周一至周日日期列表 */
export function getWeekDates() {
  const d = new Date()
  const day = d.getDay() || 7
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + 1)
  const weekdayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  const list = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(mon)
    x.setDate(mon.getDate() + i)
    const m = `${x.getMonth() + 1}`.padStart(2, '0')
    const dd = `${x.getDate()}`.padStart(2, '0')
    const date = `${x.getFullYear()}-${m}-${dd}`
    list.push({
      date,
      weekday: weekdayLabels[i],
      isToday: date === todayStr()
    })
  }
  return list
}

export function formatDateLabel(dateStr) {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${m}月${d}日`
}

export function buildMonthCells(year, month) {
  const first = new Date(year, month - 1, 1)
  const last = new Date(year, month, 0)
  const daysInMonth = last.getDate()
  const startPad = first.getDay()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push({ empty: true })
  for (let d = 1; d <= daysInMonth; d++) {
    const m = `${month}`.padStart(2, '0')
    const day = `${d}`.padStart(2, '0')
    cells.push({ empty: false, date: `${year}-${m}-${day}`, day: d })
  }
  return cells
}
