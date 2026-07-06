/** 充电桩展示文案（对齐 Qt chargingmonitor） */

export function networkStatusLabel(status) {
  const n = Number(status)
  if (n === 1) return '已联网'
  if (n === 0) return '未联网'
  return '未知'
}

export function formatPowerKw(power) {
  const n = Number(power)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `${n} kW`
}

export function formatUpdatedAt(ts) {
  if (!ts) return '尚未收到设备上报'
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} 更新`
}
