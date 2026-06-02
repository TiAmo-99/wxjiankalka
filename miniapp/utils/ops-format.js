function pad(n) {
  const s = String(n)
  return s.length > 1 ? s : `0${s}`
}

/** 时间戳格式化为 Y/M/D h:m:s（与 jzywApp cpdebug 一致） */
export function formatOpsTime(ms) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const d = new Date(n)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function pileTypeLabel(cptype) {
  if (cptype === 0) return '交流桩'
  if (cptype === 1) return '直流桩'
  return '未知'
}

export function commStatusLabel(status) {
  if (Number(status) === 1) return '通信中'
  return '离线'
}

export function faultFlagLabel(ok) {
  return Number(ok) === 0 ? '正常' : '异常'
}
