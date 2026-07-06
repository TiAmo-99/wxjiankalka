/** 充电桩展示文案（对齐 Qt chargingmonitor） */

export function networkStatusLabel(status) {
  const n = Number(status)
  if (n === 1) return '在线'
  if (n === 0) return '离线'
  return '未知'
}

export function formatPowerKw(power) {
  const n = Number(power)
  if (!Number.isFinite(n) || n <= 0) return '—'
  // 协议 devicePower 与 Qt chargingmonitor 一致，单位为 kW
  return `${n % 1 === 0 ? n : n.toFixed(1)} kW`
}

export function formatChargingMinutes(minutes) {
  const n = Number(minutes) || 0
  if (n <= 0) return '0 分钟'
  if (n < 60) return `${n} 分钟`
  const h = Math.floor(n / 60)
  const m = n % 60
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`
}

export function formatUpdatedAt(ts) {
  if (!ts) return '尚未收到设备上报'
  const d = new Date(ts)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} 更新`
}

export const PARAM_TYPE_LABELS = {
  BasicParameters: '基础参数',
  NetworkParameters: '网络参数',
  MeterParameters: '电表参数',
  EnableParameters: '使能参数',
  FeeParameters: '费率参数（只读）',
  SDKParameters: 'SDK 参数',
  QRCodeParameters: '二维码 / OCPP'
}

export const PARAM_TYPE_ICONS = {
  BasicParameters: '🔧',
  NetworkParameters: '🌐',
  MeterParameters: '⚡',
  EnableParameters: '🔀',
  FeeParameters: '💰',
  SDKParameters: '📦',
  QRCodeParameters: '📱'
}

function pickFaultField(raw, keys) {
  for (const k of keys) {
    const v = raw[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

/** 将 FaultInfo 应答项规范为展示结构（对齐 Qt FaultInfoDialog） */
export function normalizeFaultItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    code: pickFaultField(raw, ['code', 'faultCode']) || '—',
    description: pickFaultField(raw, ['description', 'message', 'desc']) || '无描述',
    level: pickFaultField(raw, ['level', 'severity']),
    time: pickFaultField(raw, ['occurrenceTime', 'time', 'timestamp']),
    status: pickFaultField(raw, ['status']),
    action: pickFaultField(raw, ['suggestedAction', 'action']),
    location: pickFaultField(raw, ['location', 'position'])
  }
}

export function normalizeFaultList(list) {
  if (!Array.isArray(list)) return []
  return list.map(normalizeFaultItem).filter(Boolean)
}

export function faultLevelClass(level) {
  const s = String(level).toLowerCase()
  if (/严重|critical|error|fatal|高/.test(s) || s === '3') return 'critical'
  if (/警告|warn|alarm|中/.test(s) || s === '2') return 'warn'
  if (/提示|info|notice|低/.test(s) || s === '1') return 'info'
  return 'default'
}
