import { mergeScanDevice } from './ble-scan-filter.js'
import { loadBleConfig } from './ble-config.js'
import { createBleTransport } from './ble-transport.js'
import { dispatchJsonMessage } from './dispatcher.js'
import {
  connection,
  resetRuntimeData,
  appendCommLog
} from './charger-store.js'
import { createHeartbeat, serializeMessage } from './protocol.js'
import {
  showPrivacyNotDeclaredGuide,
  isPrivacyNotDeclaredError,
  queryWxPrivacyStatus
} from '@/utils/wx-privacy.js'
import { getBleScanEnv, getBleScanEnvHint } from '@/utils/ble-scan-env.js'
import { bleScanLog, formatBleErr } from './ble-scan-debug.js'

let transport = null
let heartbeatTimer = null
let heartbeatSeq = 0
const deviceMap = new Map()
let deviceFoundHandler = null
let deviceFoundCallback = null
let lastLoggedDeviceCount = -1

function notifyDeviceListChanged() {
  if (typeof deviceFoundCallback === 'function') {
    deviceFoundCallback(Array.from(deviceMap.values()))
  }
}

function logDeviceCountIfChanged(reason) {
  const n = deviceMap.size
  if (n !== lastLoggedDeviceCount) {
    lastLoggedDeviceCount = n
    bleScanLog('设备列表', `${reason} → 累计 ${n} 个`)
  }
}

function ensureTransport() {
  if (!transport) {
    transport = createBleTransport({
      onJson: (json) => dispatchJsonMessage(json),
      onConnectionChange: (info) => {
        connection.state = info.state
        if (info.deviceName) connection.deviceName = info.deviceName
        if (info.deviceId) connection.deviceId = info.deviceId
        if (info.serviceId !== undefined) connection.serviceId = info.serviceId || ''
        if (info.writeId !== undefined) connection.writeId = info.writeId || ''
        if (info.notifyId !== undefined) connection.notifyId = info.notifyId || ''
        if (info.state === 'idle') {
          connection.deviceId = ''
          connection.deviceName = ''
          connection.serviceId = ''
          connection.writeId = ''
          connection.notifyId = ''
          connection.rssi = null
          stopHeartbeat()
        }
        if (info.state === 'connected') {
          connection.deviceId = info.deviceId || connection.deviceId
          connection.error = ''
          startHeartbeat()
        }
      }
    })
  }
  return transport
}

function bindDeviceFoundListener() {
  if (deviceFoundHandler) return
  deviceFoundHandler = (res) => {
    const list = res.devices || []
    if (list.length) {
      bleScanLog('onFound回调', `本批 ${list.length} 个`)
    }
    for (const d of list) {
      if (!d.deviceId) continue
      const prev = deviceMap.get(d.deviceId)
      deviceMap.set(d.deviceId, mergeScanDevice(prev, d))
    }
    logDeviceCountIfChanged('onFound')
    notifyDeviceListChanged()
  }
  uni.onBluetoothDeviceFound(deviceFoundHandler)
  bleScanLog('监听', '已注册 onBluetoothDeviceFound')
}

function unbindDeviceFoundListener() {
  if (!deviceFoundHandler) return
  try {
    uni.offBluetoothDeviceFound(deviceFoundHandler)
  } catch (_) {
    /* ignore */
  }
  deviceFoundHandler = null
}

export function getChargerTransport() {
  return ensureTransport()
}

export function onDeviceFound(callback) {
  deviceFoundCallback = callback
  return () => {
    if (deviceFoundCallback === callback) deviceFoundCallback = null
  }
}

function isBlePrivacyError(err) {
  const raw = err?.rawBle || err
  return isPrivacyNotDeclaredError(raw)
}

export async function ensureBleReady() {
  const env = getBleScanEnv()
  const envHint = getBleScanEnvHint(env)
  bleScanLog(
    '环境',
    `platform=${env.platform} android=${env.isAndroid} ios=${env.isIOS} bt=${env.bluetoothEnabled} gps=${env.locationEnabled} devtools=${env.isDevtools}`
  )
  if (envHint) {
    bleScanLog('环境', envHint, 'warn')
    throw new Error(envHint)
  }

  const t = ensureTransport()

  const privacyStatus = await queryWxPrivacyStatus()
  bleScanLog('隐私', `needAuth=${privacyStatus.needAuthorization}`)
  if (privacyStatus.needAuthorization) {
    bleScanLog('隐私', '需用户点击 agreePrivacyAuthorization 按钮', 'warn')
    throw new Error('请点击「扫描并连接」并在弹窗中同意微信隐私协议')
  }

  const openOnce = () => t.openAdapter()

  bleScanLog('适配器', 'openBluetoothAdapter…')
  try {
    await openOnce()
    bleScanLog('适配器', 'openBluetoothAdapter 成功')
  } catch (firstErr) {
    bleScanLog('适配器', `失败: ${formatBleErr(firstErr)}`, 'warn')
    if (isBlePrivacyError(firstErr)) {
      showPrivacyNotDeclaredGuide()
    } else if (String(firstErr?.message || '').includes('not authorized')) {
      throw new Error('请先在登录页完成微信隐私授权后再扫描')
    }
    throw firstErr
  }

  await logAdapterState()
  await ensureBleScanPermissions()
}

async function logAdapterState() {
  return new Promise((resolve) => {
    if (!uni.getBluetoothAdapterState) {
      bleScanLog('适配器状态', 'getBluetoothAdapterState 不可用')
      resolve()
      return
    }
    uni.getBluetoothAdapterState({
      success: (s) => {
        bleScanLog('适配器状态', `available=${s.available} discovering=${s.discovering}`)
        resolve()
      },
      fail: (err) => {
        bleScanLog('适配器状态', `查询失败: ${formatBleErr(err)}`, 'warn')
        resolve()
      }
    })
  })
}

/** Android 扫描 BLE 需要定位权限 + 系统 GPS 开启 */
async function ensureBleScanPermissions() {
  const env = getBleScanEnv()
  if (!env.isAndroid) {
    bleScanLog('权限', '非 Android，跳过定位权限')
    return
  }

  if (!env.locationEnabled) {
    bleScanLog('权限', '系统 GPS 未开启', 'warn')
    throw new Error('Android 请开启系统定位(GPS)后再扫描蓝牙')
  }

  const authed = await new Promise((resolve) => {
    uni.getSetting({
      success: (res) => resolve(!!res.authSetting?.['scope.userLocation']),
      fail: () => resolve(false)
    })
  })
  bleScanLog('权限', `scope.userLocation=${authed}`)
  if (authed) return

  bleScanLog('权限', '请求 scope.userLocation…')
  await new Promise((resolve, reject) => {
    uni.authorize({
      scope: 'scope.userLocation',
      success: () => {
        bleScanLog('权限', '定位权限已授权')
        resolve()
      },
      fail: (err) => {
        bleScanLog('权限', `定位授权失败: ${formatBleErr(err)}`, 'warn')
        uni.showModal({
          title: '需要定位权限',
          content: 'Android 扫描蓝牙需允许小程序使用定位（系统要求，不会上传您的位置）',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) uni.openSetting()
          }
        })
        reject(new Error('Android 扫描蓝牙需开启定位权限'))
      }
    })
  })
}

export async function startScan(options = {}) {
  const { skipReady = false } = options
  const t = ensureTransport()
  deviceMap.clear()
  lastLoggedDeviceCount = -1
  connection.state = 'scanning'
  connection.error = ''

  bleScanLog('开始', '——— 新一轮扫描 ———')

  if (!skipReady) {
    await ensureBleReady()
  } else {
    bleScanLog('开始', '跳过 init（弹窗前已完成）')
  }

  bindDeviceFoundListener()

  bleScanLog('扫描', 'stopBluetoothDevicesDiscovery（清理上次）')
  await t.stopDiscovery().catch((e) => {
    bleScanLog('扫描', `stop 忽略: ${formatBleErr(e)}`)
  })

  bleScanLog('扫描', 'startBluetoothDevicesDiscovery…')
  await t.startDiscovery()
  bleScanLog('扫描', 'startDiscovery 已调用，等待 onFound / getBluetoothDevices')

  for (const ms of [300, 800, 2000, 5000, 8000]) {
    setTimeout(() => {
      syncDiscoveredDevices(`定时拉取@${ms}ms`)
    }, ms)
  }

  setTimeout(() => {
    if (connection.state !== 'scanning') return
    const n = deviceMap.size
    if (n === 0) {
      bleScanLog(
        '诊断',
        '8秒内仍为 0：请确认手机蓝牙/GPS已开；若日志有 errno=112 需在公众平台勾选「蓝牙」',
        'warn'
      )
      logAdapterState()
    } else {
      bleScanLog('诊断', `8秒内发现 ${n} 个设备`, 'info')
    }
  }, 8000)
}

export async function stopScan() {
  const t = ensureTransport()
  await t.stopDiscovery()
  if (connection.state === 'scanning') connection.state = 'idle'
}

export async function connectDevice(deviceId, deviceName = '') {
  const t = ensureTransport()
  t.setConfig(loadBleConfig())
  resetRuntimeData()
  connection.deviceId = deviceId
  connection.deviceName = deviceName
  connection.error = ''
  connection.rssi = deviceMap.get(deviceId)?.RSSI ?? null
  await stopScan()
  try {
    await t.connect(deviceId, deviceName)
  } catch (e) {
    connection.state = 'error'
    connection.error = e.message || ''
    throw e
  }
}

export async function disconnectDevice() {
  stopHeartbeat()
  const t = ensureTransport()
  await t.disconnect()
  resetRuntimeData()
}

export function startHeartbeat() {
  stopHeartbeat()
  heartbeatSeq = 0
  const tick = async () => {
    if (connection.state !== 'connected') return
    try {
      heartbeatSeq += 1
      const t = ensureTransport()
      await t.sendJson(createHeartbeat(heartbeatSeq))
    } catch (e) {
      appendCommLog({ dir: 'TX', mode: 'warn', text: `心跳失败: ${e.message}` })
    }
  }
  tick()
  heartbeatTimer = setInterval(tick, 10000)
}

export function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

export async function sendProtocolJson(msg) {
  const t = ensureTransport()
  await t.sendJson(msg)
}

export async function sendRawText(text) {
  const t = ensureTransport()
  await t.sendText(text)
}

export async function sendRawHex(hex) {
  const t = ensureTransport()
  await t.sendHex(hex)
}

export async function sendRawJsonString(jsonStr) {
  let obj
  try {
    obj = JSON.parse(jsonStr)
  } catch (e) {
    throw new Error('JSON 格式错误')
  }
  const t = ensureTransport()
  await t.sendText(serializeMessage(obj))
}

export function getScannedDevices() {
  return Array.from(deviceMap.values())
}

/** 从系统缓存同步已发现设备（配合 onBluetoothDeviceFound） */
export function syncDiscoveredDevices(reason = '手动') {
  return new Promise((resolve) => {
    if (!uni.getBluetoothDevices) {
      bleScanLog('getDevices', `${reason}: API 不可用`, 'warn')
      resolve()
      return
    }
    uni.getBluetoothDevices({
      success: (res) => {
        const raw = res.devices || []
        let added = 0
        for (const d of raw) {
          if (!d.deviceId) continue
          const had = deviceMap.has(d.deviceId)
          const prev = deviceMap.get(d.deviceId)
          deviceMap.set(d.deviceId, mergeScanDevice(prev, d))
          if (!had) added++
        }
        logDeviceCountIfChanged('getDevices')
        notifyDeviceListChanged()
        resolve()
      },
      fail: (err) => {
        bleScanLog('getDevices', `${reason} 失败: ${formatBleErr(err)}`, 'warn')
        resolve()
      }
    })
  })
}

export function destroySession() {
  stopHeartbeat()
  unbindDeviceFoundListener()
  deviceFoundCallback = null
  if (transport) {
    transport.disconnect().catch(() => {})
    transport.closeAdapter().catch(() => {})
  }
  transport = null
  deviceMap.clear()
}
