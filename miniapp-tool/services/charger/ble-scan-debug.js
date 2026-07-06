import { appendCommLog } from './charger-store.js'

/** 扫描诊断：默认仅 console，避免刷屏底部日志区 */
export const BLE_SCAN_DEBUG = true

export function formatBleErr(err) {
  if (!err) return 'unknown'
  const raw = err.rawBle || err
  const parts = []
  if (raw.errMsg) parts.push(raw.errMsg)
  else if (err.message) parts.push(err.message)
  if (raw.errno != null) parts.push(`errno=${raw.errno}`)
  if (raw.errCode != null) parts.push(`code=${raw.errCode}`)
  return parts.join(' | ') || String(err)
}

export function bleScanLog(stage, detail, mode = 'info', options = {}) {
  const text = `[扫描·${stage}] ${detail}`
  if (BLE_SCAN_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[BLE-Scan]', text)
  }
  const toUi = options.toUi ?? mode === 'warn'
  if (toUi) {
    appendCommLog({ dir: 'RX', mode, text })
  }
}
