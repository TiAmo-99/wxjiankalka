import { reactive } from 'vue'
import {
  createFirmwareUpgradeStart,
  createFirmwareUpgradeData,
  createFirmwareUpgradeEnd,
  firmwarePacketCrc,
  FIRMWARE_RESPONSE,
  FIRMWARE_STATUS
} from './protocol.js'
import { appendCommLog } from './charger-store.js'

const DEFAULT_PACKET_SIZE = 1024
const RESPONSE_TIMEOUT_MS = 30000
const MAX_RETRY = 3

export const firmwareState = reactive({
  phase: 'idle',
  fileName: '',
  firmwareVersion: '',
  fileSize: 0,
  packetSize: DEFAULT_PACKET_SIZE,
  totalPackets: 0,
  currentPacket: -1,
  ackedCount: 0,
  progress: 0,
  statusText: '请选择固件文件',
  error: '',
  logs: []
})

let fileBuffer = null
let ackStatus = []
let active = false
let sendJsonFn = null
let responseTimer = null
let retryPacket = -1
let retryCount = 0

function log(line) {
  const ts = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const text = `[${p(ts.getHours())}:${p(ts.getMinutes())}:${p(ts.getSeconds())}] ${line}`
  firmwareState.logs.unshift(text)
  if (firmwareState.logs.length > 80) firmwareState.logs.length = 80
  appendCommLog({ dir: 'RX', mode: 'text', text: `[固件] ${line}` })
}

function clearResponseTimer() {
  if (responseTimer) {
    clearTimeout(responseTimer)
    responseTimer = null
  }
}

function armResponseTimer() {
  clearResponseTimer()
  responseTimer = setTimeout(() => {
    if (!active) return
    if (retryCount >= MAX_RETRY) {
      failUpgrade(`数据包 ${retryPacket >= 0 ? retryPacket : firmwareState.currentPacket} 响应超时`)
      return
    }
    retryCount += 1
    const idx = retryPacket >= 0 ? retryPacket : firmwareState.currentPacket
    log(`包 ${idx} 超时，第 ${retryCount} 次重试`)
    sendPacket(idx).catch((e) => failUpgrade(e.message))
  }, RESPONSE_TIMEOUT_MS)
}

function updateProgress() {
  const acked = ackStatus.filter(Boolean).length
  firmwareState.ackedCount = acked
  firmwareState.progress =
    firmwareState.totalPackets > 0 ? Math.floor((acked / firmwareState.totalPackets) * 100) : 0
}

export function setFirmwareFile(meta, buffer) {
  fileBuffer = buffer
  firmwareState.fileName = meta.name
  firmwareState.firmwareVersion = meta.version
  firmwareState.fileSize = buffer.byteLength
  firmwareState.packetSize = DEFAULT_PACKET_SIZE
  firmwareState.totalPackets = Math.ceil(buffer.byteLength / DEFAULT_PACKET_SIZE)
  firmwareState.phase = 'ready'
  firmwareState.progress = 0
  firmwareState.ackedCount = 0
  firmwareState.currentPacket = -1
  firmwareState.error = ''
  firmwareState.statusText = '文件已就绪，可开始升级'
  log(`已加载 ${meta.name}，${buffer.byteLength} 字节，${firmwareState.totalPackets} 包`)
}

export function clearFirmwareFile() {
  stopFirmwareUpgrade(true)
  fileBuffer = null
  firmwareState.phase = 'idle'
  firmwareState.fileName = ''
  firmwareState.firmwareVersion = ''
  firmwareState.fileSize = 0
  firmwareState.totalPackets = 0
  firmwareState.progress = 0
  firmwareState.statusText = '请选择固件文件'
  firmwareState.error = ''
}

function failUpgrade(message) {
  active = false
  clearResponseTimer()
  firmwareState.phase = 'error'
  firmwareState.error = message
  firmwareState.statusText = message
  log(`失败: ${message}`)
}

async function sendPacket(packetIndex) {
  if (!fileBuffer || !sendJsonFn) return
  const size = firmwareState.packetSize
  const start = packetIndex * size
  const end = Math.min(start + size, fileBuffer.byteLength)
  const slice = fileBuffer.slice(start, end)
  const bytes = new Uint8Array(slice)
  const crc = firmwarePacketCrc(bytes)
  const base64 = uni.arrayBufferToBase64(slice)

  retryPacket = packetIndex
  firmwareState.currentPacket = packetIndex
  firmwareState.phase = 'transferring'
  firmwareState.statusText = `发送数据包 ${packetIndex + 1}/${firmwareState.totalPackets}`

  await sendJsonFn(
    createFirmwareUpgradeData(packetIndex, firmwareState.totalPackets, base64, crc)
  )
  armResponseTimer()
}

function sendNextPacket() {
  if (!active) return
  let next = -1
  for (let i = 0; i < firmwareState.totalPackets; i++) {
    if (!ackStatus[i]) {
      next = i
      break
    }
  }
  if (next < 0) {
    sendEndCommand()
    return
  }
  sendPacket(next).catch((e) => failUpgrade(e.message))
}

async function sendEndCommand() {
  firmwareState.phase = 'ending'
  firmwareState.statusText = '发送结束命令…'
  try {
    await sendJsonFn(createFirmwareUpgradeEnd(FIRMWARE_STATUS.COMPLETED, ''))
    log('已发送结束命令')
    armResponseTimer()
  } catch (e) {
    failUpgrade(e.message || '发送结束命令失败')
  }
}

export async function startFirmwareUpgrade(sendJson) {
  if (!fileBuffer) throw new Error('请先选择固件文件')
  if (active) throw new Error('升级正在进行中')

  sendJsonFn = sendJson
  active = true
  retryCount = 0
  retryPacket = -1
  ackStatus = new Array(firmwareState.totalPackets).fill(false)
  firmwareState.ackedCount = 0
  firmwareState.progress = 0
  firmwareState.phase = 'starting'
  firmwareState.statusText = '发送开始命令…'
  firmwareState.error = ''
  log('开始固件升级')

  await sendJson(
    createFirmwareUpgradeStart(
      firmwareState.fileSize,
      firmwareState.totalPackets,
      firmwareState.packetSize,
      firmwareState.firmwareVersion
    )
  )
  armResponseTimer()
}

export function stopFirmwareUpgrade(silent = false) {
  const wasActive = active
  const send = sendJsonFn
  active = false
  clearResponseTimer()
  sendJsonFn = null
  if (wasActive && !silent) {
    if (send) {
      send(createFirmwareUpgradeEnd(FIRMWARE_STATUS.CANCELLED, 'user cancel')).catch(() => {})
    }
    firmwareState.phase = 'cancelled'
    firmwareState.statusText = '已取消升级'
    log('用户取消升级')
  } else if (!wasActive && firmwareState.fileName) {
    firmwareState.phase = 'ready'
  } else if (!wasActive) {
    firmwareState.phase = 'idle'
  }
}

export function handleFirmwareUpgradeResponse(data) {
  if (!data || data.subCommand !== 'Response') return
  if (!active && firmwareState.phase !== 'ending') return

  clearResponseTimer()
  const response = Number(data.response)
  const packetIndex = data.packetIndex !== undefined ? Number(data.packetIndex) : -1
  const message = String(data.message || '')

  if (response === FIRMWARE_RESPONSE.ACK) {
    retryCount = 0
    if (packetIndex >= 0 && packetIndex < firmwareState.totalPackets) {
      ackStatus[packetIndex] = true
      updateProgress()
      log(`包 ${packetIndex} ACK`)
      sendNextPacket()
    } else if (packetIndex === -1) {
      log('开始命令 ACK，发送数据包')
      sendNextPacket()
    }
    return
  }

  if (response === FIRMWARE_RESPONSE.NACK) {
    log(`包 ${packetIndex} NACK: ${message || '—'}`)
    if (packetIndex >= 0) {
      sendPacket(packetIndex).catch((e) => failUpgrade(e.message))
    } else {
      failUpgrade(message || '设备拒绝升级')
    }
    return
  }

  if (response === FIRMWARE_RESPONSE.COMPLETED) {
    active = false
    firmwareState.phase = 'done'
    firmwareState.progress = 100
    firmwareState.statusText = '升级完成'
    log(`完成: ${message || '成功'}`)
    return
  }

  if (response === FIRMWARE_RESPONSE.ERROR) {
    failUpgrade(message || '设备报告升级错误')
  }
}
