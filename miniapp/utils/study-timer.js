/** 学习任务计时工具 */

export function formatTimeHHMM(date = new Date()) {
  const h = date.getHours()
  const m = date.getMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 显示用：MM:SS 或 H:MM:SS */
export function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

/** 毫秒 → 上报分钟（至少 1 分钟，四舍五入） */
export function msToReportMinutes(ms) {
  if (!ms || ms < 1000) return 0
  return Math.max(1, Math.round(ms / 60000))
}
