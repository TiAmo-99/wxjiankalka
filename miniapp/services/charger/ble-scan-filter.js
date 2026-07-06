/**
 * 扫描列表：显示全部 BLE 设备（未命名用 MAC 后缀），CCU621 置顶
 */

import { CCU621_BLE } from './ble-config.js'

function decodeBleAdvUtf8(bytes) {
  try {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes).trim()
    }
  } catch (_) {
    /* ignore */
  }
  let s = ''
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]
    if (c >= 32 && c < 127) s += String.fromCharCode(c)
  }
  return s.trim()
}

/** 从广播包解析设备名（0x08 短名 / 0x09 完整名） */
export function parseAdvertiseLocalName(advertisData) {
  if (!advertisData) return ''
  try {
    const bytes =
      advertisData instanceof ArrayBuffer
        ? new Uint8Array(advertisData)
        : new Uint8Array(advertisData.buffer || advertisData)
    let i = 0
    while (i + 1 < bytes.length) {
      const len = bytes[i]
      if (len < 1) break
      const type = bytes[i + 1]
      const dataStart = i + 2
      const dataEnd = i + 1 + len
      if (dataEnd > bytes.length) break
      if (type === 0x08 || type === 0x09) {
        return decodeBleAdvUtf8(bytes.subarray(dataStart, dataEnd))
      }
      i = dataEnd
    }
  } catch (_) {
    /* ignore */
  }
  return ''
}

/** CCU621 调试广播名 / fff1 服务优先识别 */
export function isCcu621BleDevice(raw) {
  const d = normalizeScanDevice(raw)
  const name = `${d.name} ${d.localName} ${d.advName}`.toUpperCase()
  if (name.includes('CCU621') || name.includes(CCU621_BLE.advName.toUpperCase())) return true
  return (d.advertisServiceUUIDs || []).some((u) => String(u).toLowerCase().includes('fff1'))
}

/** 艾尔赛 USB 转蓝牙等经典蓝牙 SPP 模块（系统设置可见，但非 BLE） */
export function isLikelyClassicBtModule(name) {
  const n = String(name || '').trim().toLowerCase()
  if (!n) return false
  return (
    n.includes('niren') ||
    n.includes('hc-05') ||
    n.includes('hc-06') ||
    n.includes('hc05') ||
    n.includes('hc06') ||
    n.includes('linvor') ||
    n.includes('btspp')
  )
}

export function normalizeScanDevice(raw) {
  const name = String(raw?.name || '').trim()
  const localName = String(raw?.localName || '').trim()
  const advName = parseAdvertiseLocalName(raw?.advertisData)
  const displayName = name || localName || advName
  const rssi = raw?.RSSI
  return {
    deviceId: raw.deviceId,
    name: displayName,
    localName: localName || advName,
    advName,
    RSSI: typeof rssi === 'number' && Number.isFinite(rssi) ? rssi : null,
    advertisServiceUUIDs: raw?.advertisServiceUUIDs || []
  }
}

export function mergeScanDevice(prev, incoming) {
  const next = normalizeScanDevice(incoming)
  if (!prev) return next
  const name = next.name || prev.name || next.localName || prev.localName || next.advName || prev.advName
  const localName = next.localName || prev.localName
  const advName = next.advName || prev.advName
  const rssi =
    next.RSSI != null && prev.RSSI != null
      ? Math.max(next.RSSI, prev.RSSI)
      : next.RSSI ?? prev.RSSI ?? null
  const advertisServiceUUIDs =
    next.advertisServiceUUIDs?.length ? next.advertisServiceUUIDs : prev.advertisServiceUUIDs || []
  return { deviceId: next.deviceId, name, localName, advName, RSSI: rssi, advertisServiceUUIDs }
}

function fallbackBleName(deviceId) {
  const id = String(deviceId || '')
  const tail = id.replace(/:/g, '').slice(-8).toUpperCase()
  return tail ? `未命名·${tail}` : '未命名设备'
}

/** CCU621 置顶，有名称优先，再按显示名称排序 */
function compareBleDisplayName(a, b) {
  if (a.isCcu621 !== b.isCcu621) return a.isCcu621 ? -1 : 1
  if (a.isUnnamed !== b.isUnnamed) return a.isUnnamed ? 1 : -1
  const byName = a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base', numeric: true })
  if (byName !== 0) return byName
  return String(a.deviceId).localeCompare(String(b.deviceId))
}

/** 显示全部扫描到的设备（未命名显示 MAC 后缀） */
export function displayBleDevices(devices) {
  const list = []
  let named = 0
  let unnamed = 0
  for (const raw of devices) {
    const d = normalizeScanDevice(raw)
    const ccu = isCcu621BleDevice(raw)
    if (d.name) {
      named++
      list.push({
        deviceId: d.deviceId,
        name: d.name,
        localName: d.localName,
        RSSI: d.RSSI,
        isUnnamed: false,
        isCcu621: ccu
      })
    } else {
      unnamed++
      list.push({
        deviceId: d.deviceId,
        name: fallbackBleName(d.deviceId),
        localName: '',
        RSSI: d.RSSI,
        isUnnamed: true,
        isCcu621: ccu
      })
    }
  }
  list.sort(compareBleDisplayName)
  return { list, total: devices.length, named, unnamed }
}

/** @deprecated 使用 displayBleDevices */
export function filterNamedBleDevices(devices) {
  const { list, total, named, unnamed } = displayBleDevices(devices)
  const onlyNamed = list.filter((d) => !d.isUnnamed)
  return { list: onlyNamed, total, unnamed }
}

export function formatScanSummary(total, shown, named, unnamed) {
  if (total === 0) return '正在搜索 BLE 设备…'
  if (shown === 0) return '暂未发现 BLE 设备'
  const parts = [`共 ${shown} 个 BLE`]
  if (named > 0) parts.push(`有名称 ${named}`)
  if (unnamed > 0) parts.push(`未命名 ${unnamed}`)
  return parts.join('，')
}
