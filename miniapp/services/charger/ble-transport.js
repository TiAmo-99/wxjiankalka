import { loadBleConfig } from './ble-config.js'
import { createJsonFramer } from './json-framer.js'
import { appendCommLog } from './charger-store.js'
import { bleScanLog, formatBleErr } from './ble-scan-debug.js'

function ab2str(buffer) {
  if (!buffer) return ''
  try {
    const arr = new Uint8Array(buffer)
    let s = ''
    const chunk = 0x8000
    for (let i = 0; i < arr.length; i += chunk) {
      s += String.fromCharCode.apply(null, arr.subarray(i, i + chunk))
    }
    return decodeURIComponent(escape(s))
  } catch (_) {
    return ''
  }
}

function str2ab(str) {
  const s = unescape(encodeURIComponent(str))
  const buf = new ArrayBuffer(s.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i)
  return buf
}

function hexPreview(buffer) {
  const arr = new Uint8Array(buffer)
  const parts = []
  for (let i = 0; i < Math.min(arr.length, 64); i++) {
    parts.push(arr[i].toString(16).padStart(2, '0'))
  }
  const tail = arr.length > 64 ? '…' : ''
  return parts.join(' ') + tail + ` (${arr.length}B)`
}

function normUuid(u) {
  return String(u || '')
    .replace(/-/g, '')
    .toLowerCase()
}

function uuidMatch(a, b) {
  if (!a || !b) return false
  const na = normUuid(a)
  const nb = normUuid(b)
  return na === nb || na.endsWith(nb) || nb.endsWith(na)
}

export function isPrivacyNotDeclaredError(err) {
  const msg = String(err?.errMsg || err?.message || err || '')
  const errno = err?.errno ?? err?.errCode
  return (
    errno === 112 ||
    msg.includes('privacy agreement') ||
    msg.includes('api scope is not declared')
  )
}

export function translateBleError(err) {
  const msg = String(err?.errMsg || err?.message || err || '')
  const code = err?.errCode ?? err?.code ?? err?.errno
  if (isPrivacyNotDeclaredError(err)) {
    return '蓝牙权限未就绪，请同意微信隐私协议；若仍失败请联系管理员在公众平台勾选「蓝牙」'
  }
  if (code === 10001 || msg.includes('10001')) return '请打开手机蓝牙'
  if (code === 10002 || msg.includes('10002')) return '未找到指定设备'
  if (code === 10003 || msg.includes('10003')) return '连接失败，请靠近设备后重试'
  if (code === 10004 || msg.includes('10004')) return '未找到指定服务/特征值，请检查 UUID 配置'
  if (code === 10005 || msg.includes('10005')) return '蓝牙特征值不支持当前操作'
  if (code === 10006 || msg.includes('10006')) return '当前未连接蓝牙设备'
  if (code === 10009 || msg.includes('10009')) return '系统蓝牙异常，请重启蓝牙后重试'
  if (code === 10012 || msg.includes('10012')) return '连接超时，请确认设备可被发现'
  if (msg.includes('auth deny') || msg.includes('authorize')) return '未授权蓝牙，请在设置中开启'
  if (msg.includes('location') || msg.includes('定位') || msg.includes('10016')) {
    return 'Android 扫描蓝牙需开启定位权限，请在系统设置中允许'
  }
  return msg || '蓝牙操作失败'
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function createBleTransport(hooks = {}) {
  const { onJson, onConnectionChange, onRawData } = hooks
  let config = loadBleConfig()
  let deviceId = ''
  let serviceId = ''
  let writeId = ''
  let notifyId = ''
  let writeNoResponse = false
  let activeChunkSize = 0
  let discovering = false
  let framer = null
  let valueListener = null
  let connListener = null

  function setConfig(c) {
    config = { ...config, ...c }
  }

  function notifyConn(state, extra = {}) {
    if (typeof onConnectionChange === 'function') {
      onConnectionChange({
        state,
        deviceId,
        serviceId,
        writeId,
        notifyId,
        writeNoResponse,
        ...extra
      })
    }
  }

  function setupConnListener() {
    if (connListener) return
    connListener = (res) => {
      if (!deviceId || res.deviceId !== deviceId) return
      if (!res.connected) {
        appendCommLog({ dir: 'RX', mode: 'warn', text: '蓝牙连接已断开' })
        cleanupAfterDisconnect()
        notifyConn('idle')
      }
    }
    uni.onBLEConnectionStateChange(connListener)
  }

  function removeConnListener() {
    if (!connListener) return
    try {
      uni.offBLEConnectionStateChange(connListener)
    } catch (_) {
      /* ignore */
    }
    connListener = null
  }

  function cleanupAfterDisconnect() {
    if (valueListener) {
      try {
        uni.offBLECharacteristicValueChange(valueListener)
      } catch (_) {
        /* ignore */
      }
      valueListener = null
    }
    framer?.destroy()
    framer = null
    deviceId = ''
    serviceId = ''
    writeId = ''
    notifyId = ''
    activeChunkSize = 0
  }

  function openAdapter() {
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (fn, val) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        fn(val)
      }
      const timer = setTimeout(() => {
        finish(
          reject,
          Object.assign(new Error('openBluetoothAdapter 超时，请确认已同意微信隐私协议'), {
            rawBle: { errMsg: 'openBluetoothAdapter:timeout' }
          })
        )
      }, 12000)

      uni.openBluetoothAdapter({
        success: (res) => {
          bleScanLog('openAdapter', 'success')
          finish(resolve, res)
        },
        fail: (err) => {
          const msg = String(err?.errMsg || '')
          if (msg.includes('already') || err?.errCode === -1) {
            bleScanLog('openAdapter', 'already open，视为成功')
            finish(resolve)
            return
          }
          bleScanLog('openAdapter', `fail: ${formatBleErr(err)}`, 'warn')
          const e = new Error(translateBleError(err))
          e.rawBle = err
          finish(reject, e)
        }
      })
    })
  }

  function closeAdapter() {
    return new Promise((resolve) => {
      uni.closeBluetoothAdapter({ complete: resolve })
    })
  }

  function getAdapterState() {
    return new Promise((resolve) => {
      if (!uni.getBluetoothAdapterState) {
        resolve({ available: true, discovering: false })
        return
      }
      uni.getBluetoothAdapterState({
        success: resolve,
        fail: () => resolve({ available: true, discovering: false })
      })
    })
  }

  function startDiscovery() {
    return new Promise((resolve, reject) => {
      discovering = true
      const opts = {
        allowDuplicatesKey: true,
        // 提高扫描强度，便于发现弱广播 / 仅广播名的设备
        powerLevel: 'high',
        interval: 0,
        success: (res) => {
          bleScanLog('startDiscovery', 'success (powerLevel=high)')
          resolve(res)
        },
        fail: (err) => {
          discovering = false
          const detail = formatBleErr(err)
          bleScanLog('startDiscovery', `fail: ${detail}`, 'warn')
          appendCommLog({
            dir: 'RX',
            mode: 'warn',
            text: `扫描启动失败: ${translateBleError(err)} (${detail})`
          })
          const e = new Error(translateBleError(err))
          e.rawBle = err
          reject(e)
        }
      }
      uni.startBluetoothDevicesDiscovery(opts)
    })
  }

  function stopDiscovery() {
    discovering = false
    return new Promise((resolve) => {
      uni.stopBluetoothDevicesDiscovery({ complete: resolve })
    })
  }

  async function pickCharacteristics(sid) {
    const res = await new Promise((resolve, reject) => {
      uni.getBLEDeviceCharacteristics({
        deviceId,
        serviceId: sid,
        success: resolve,
        fail: reject
      })
    })
    const chars = res.characteristics || []
    let w = null
    let n = null
    let noRsp = false

    for (const c of chars) {
      const p = c.properties || {}
      if (config.writeCharacteristicId && uuidMatch(c.uuid, config.writeCharacteristicId)) {
        w = c.uuid
        noRsp = !!p.writeNoResponse && !p.write
      }
      if (config.notifyCharacteristicId && uuidMatch(c.uuid, config.notifyCharacteristicId)) {
        n = c.uuid
      }
    }

    for (const c of chars) {
      const p = c.properties || {}
      if (!w && (p.write || p.writeNoResponse)) {
        w = c.uuid
        noRsp = !!p.writeNoResponse && !p.write
      }
      if (!n && (p.notify || p.indicate)) n = c.uuid
    }

    return { writeId: w, notifyId: n, writeNoResponse: noRsp }
  }

  function servicePriority(svc) {
    if (config.serviceId && uuidMatch(svc.uuid, config.serviceId)) return 0
    const u = normUuid(svc.uuid)
    if (u.includes('fff1')) return 1
    return 2
  }

  async function resolveServiceAndChars(services) {
    const list = services || []
    if (!list.length) throw new Error('未发现 BLE 服务')

    const tryOrder = [...list].sort((a, b) => servicePriority(a) - servicePriority(b))

    for (const svc of tryOrder) {
      try {
        const picked = await pickCharacteristics(svc.uuid)
        if (picked.writeId) {
          return {
            serviceId: svc.uuid,
            writeId: picked.writeId,
            notifyId: picked.notifyId || '',
            writeNoResponse: picked.writeNoResponse
          }
        }
      } catch (_) {
        /* try next service */
      }
    }
    throw new Error('未找到可写特征值，请配置 Service / Write UUID')
  }

  async function trySetMtu() {
    if (!deviceId || !uni.setBLEMTU) return
    try {
      await new Promise((resolve) => {
        uni.setBLEMTU({
          deviceId,
          mtu: 512,
          success: (res) => {
            const mtu = Number(res?.mtu) || 512
            activeChunkSize = Math.min(180, Math.max(20, mtu - 3))
            bleScanLog('MTU', `set ${mtu}B, chunk=${activeChunkSize}`)
            resolve()
          },
          fail: () => {
            activeChunkSize = 20
            resolve()
          }
        })
      })
    } catch (_) {
      activeChunkSize = 20
    }
  }

  async function setupNotify() {
    if (!notifyId) return

    await new Promise((resolve, reject) => {
      uni.notifyBLECharacteristicValueChange({
        deviceId,
        serviceId,
        characteristicId: notifyId,
        state: true,
        success: resolve,
        fail: reject
      })
    })

    if (valueListener) {
      try {
        uni.offBLECharacteristicValueChange(valueListener)
      } catch (_) {
        /* ignore */
      }
    }

    valueListener = (res) => {
      if (res.deviceId !== deviceId) return
      if (typeof onRawData === 'function') onRawData(res.value)
      // 原始 ArrayBuffer 追加到组帧器，不在此逐段 JSON.parse
      framer?.feed(res.value)
    }
    uni.onBLECharacteristicValueChange(valueListener)
  }

  async function connect(targetDeviceId, targetName = '') {
    config = loadBleConfig()
    await openAdapter()
    await stopDiscovery()
    setupConnListener()

    deviceId = targetDeviceId
    notifyConn('connecting', { deviceName: targetName })

    await new Promise((resolve, reject) => {
      uni.createBLEConnection({
        deviceId,
        timeout: 15000,
        success: resolve,
        fail: (err) => reject(new Error(translateBleError(err)))
      })
    })

    await delay(400)
    await trySetMtu()

    const svcRes = await new Promise((resolve, reject) => {
      uni.getBLEDeviceServices({
        deviceId,
        success: resolve,
        fail: (err) => reject(new Error(translateBleError(err)))
      })
    })

    const resolved = await resolveServiceAndChars(svcRes.services || [])
    serviceId = resolved.serviceId
    writeId = resolved.writeId
    notifyId = resolved.notifyId
    writeNoResponse = resolved.writeNoResponse

    framer = createJsonFramer(
      (json) => {
        appendCommLog({ dir: 'RX', mode: 'json', text: JSON.stringify(json) })
        if (onJson) onJson(json)
      },
      {
        onWarn: (msg) => appendCommLog({ dir: 'RX', mode: 'warn', text: msg })
      }
    )

    await setupNotify()

    if (!notifyId) {
      appendCommLog({
        dir: 'RX',
        mode: 'warn',
        text: '未找到 Notify 特征，仅可发送、无法接收'
      })
    }

    notifyConn('connected', {
      deviceName: targetName,
      serviceId,
      writeId,
      notifyId,
      writeNoResponse
    })
    return { deviceId, serviceId, writeId, notifyId }
  }

  async function disconnect() {
    removeConnListener()
    if (deviceId) {
      try {
        await new Promise((resolve) => {
          uni.closeBLEConnection({ deviceId, complete: resolve })
        })
      } catch (_) {
        /* ignore */
      }
    }
    cleanupAfterDisconnect()
    notifyConn('idle')
  }

  async function writeBuffer(buffer) {
    if (!deviceId || !writeId) throw new Error('未连接蓝牙')
    const arr = new Uint8Array(buffer)
    const chunkSize = Math.max(8, activeChunkSize || Number(config.writeChunkSize) || 20)

    for (let offset = 0; offset < arr.length; offset += chunkSize) {
      const slice = arr.slice(offset, offset + chunkSize)
      await new Promise((resolve, reject) => {
        const opts = {
          deviceId,
          serviceId,
          characteristicId: writeId,
          value: slice.buffer,
          success: resolve,
          fail: (err) => reject(new Error(translateBleError(err)))
        }
        if (writeNoResponse) opts.writeType = 'writeNoResponse'
        uni.writeBLECharacteristicValue(opts)
      })
      if (arr.length > chunkSize) await delay(15)
    }
  }

  async function sendText(text) {
    const buf = str2ab(text)
    await writeBuffer(buf)
  }

  async function sendJson(obj, { appendCrlf, log = true } = {}) {
    const useCrlf = appendCrlf !== undefined ? appendCrlf : config.appendCrlf
    const text = JSON.stringify(obj) + (useCrlf ? '\r\n' : '')
    if (log) {
      appendCommLog({ dir: 'TX', mode: 'json', text: JSON.stringify(obj) })
    }
    await sendText(text)
  }

  async function sendHex(hexStr) {
    const clean = hexStr.replace(/\s+/g, '')
    if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2 !== 0) {
      throw new Error('十六进制格式无效')
    }
    const arr = new Uint8Array(clean.length / 2)
    for (let i = 0; i < arr.length; i++) {
      arr[i] = parseInt(clean.substr(i * 2, 2), 16)
    }
    appendCommLog({ dir: 'TX', mode: 'hex', text: hexPreview(arr.buffer) })
    await writeBuffer(arr.buffer)
  }

  return {
    setConfig,
    openAdapter,
    closeAdapter,
    getAdapterState,
    startDiscovery,
    stopDiscovery,
    isDiscovering: () => discovering,
    connect,
    disconnect,
    sendText,
    sendJson,
    sendHex,
    getDeviceId: () => deviceId,
    getMeta: () => ({ deviceId, serviceId, writeId, notifyId, writeNoResponse })
  }
}
