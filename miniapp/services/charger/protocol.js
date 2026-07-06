/** 充电系统 JSON 协议 v2.0（对齐 iestool chargingprotocol） */

export const PROTOCOL_VERSION = '2.0'

export const CMD = {
  HEARTBEAT: 'Heartbeat',
  SYSTEM_INFO: 'SystemInfo',
  GUN_INFO: 'GunInfo',
  CHARGE_CONTROL: 'ChargeControl',
  PARAM_QUERY: 'ParamQuery',
  PARAM_MODIFY: 'ParamModify',
  FIRMWARE_UPGRADE: 'FirmwareUpgrade',
  FILE_OPERATIONS: 'FileOperations',
  FAULT_INFO: 'FaultInfo',
  HISTORY_OPERATIONS: 'HistoryOperations',
  CUSTOM_DATA: 'CustomData'
}

export const STATUS = {
  SUCCESS: 0,
  ERROR: 1,
  INVALID_CMD: 2,
  PARAM_ERROR: 3,
  DEVICE_BUSY: 4,
  NOT_CONNECTED: 5,
  GUN_NOT_FOUND: 6
}

export const CHARGE_ACTION = {
  STOP: 0,
  START: 1
}

export const HEARTBEAT_SOURCE = {
  DEVICE: 'device',
  CLIENT: 'client'
}

/** CCU621 tcp_protocol.h */
export const CHARGING_STATUS_LABEL = {
  0: '空闲',
  1: '已连接',
  2: '启动中',
  3: '充电中',
  4: '充电完成'
}

export const GUN_CONNECTION_LABEL = {
  0: '未插枪',
  1: '已插枪'
}

export const PARAM_TYPES = [
  'BasicParameters',
  'NetworkParameters',
  'MeterParameters',
  'EnableParameters',
  'FeeParameters',
  'SDKParameters',
  'QRCodeParameters'
]

const CMD_SET = new Set(Object.values(CMD))

export function getCurrentTimestamp() {
  const d = new Date()
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  const ms = pad(d.getMilliseconds(), 3)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`
}

export function wrapCommand(command, data = {}) {
  return {
    version: PROTOCOL_VERSION,
    timestamp: getCurrentTimestamp(),
    command,
    data
  }
}

export function validateProtocol(json) {
  if (!json || typeof json !== 'object') return { ok: false, message: '非对象' }
  if (!json.version) return { ok: false, message: '缺少 version' }
  if (json.version !== PROTOCOL_VERSION) {
    return { ok: false, message: `版本不匹配: ${json.version}` }
  }
  if (!json.timestamp) return { ok: false, message: '缺少 timestamp' }
  if (!json.command || typeof json.command !== 'string') {
    return { ok: false, message: '缺少 command' }
  }
  if (!CMD_SET.has(json.command)) {
    return { ok: false, message: `未知命令: ${json.command}` }
  }
  return { ok: true }
}

export function parseCommand(json) {
  return json?.command || ''
}

export function parseStatus(json) {
  if (json?.status === undefined) return null
  return Number(json.status)
}

export function serializeMessage(msg, { appendCrlf = false } = {}) {
  const text = JSON.stringify(msg)
  return appendCrlf ? `${text}\r\n` : text
}

export function createClientHeartbeat(sequence = 0) {
  return wrapCommand(CMD.HEARTBEAT, {
    sequence: Number(sequence) || 0,
    source: HEARTBEAT_SOURCE.CLIENT
  })
}

/** @deprecated 使用 createClientHeartbeat */
export function createHeartbeat(sequence) {
  return createClientHeartbeat(sequence)
}

export function createChargeControl(gunNumber, action) {
  return wrapCommand(CMD.CHARGE_CONTROL, {
    gunNumber: Number(gunNumber),
    action: Number(action)
  })
}

export function createParamQuery(paramType) {
  return wrapCommand(CMD.PARAM_QUERY, { type: paramType })
}

export function createParamModify(paramType, params) {
  const normalized = (params || []).map((p) => {
    const type = String(p.type || 'string')
    let value = p.value
    if (
      type === 'uint8' ||
      type === 'int' ||
      type === 'uint8_array' ||
      type === 'uint16' ||
      type === 'uint32' ||
      type === 'bit'
    ) {
      value = String(value ?? '')
    }
    return { name: p.name, value }
  })
  return wrapCommand(CMD.PARAM_MODIFY, { type: paramType, params: normalized })
}

export function createCustomData(functionField, functionContent, functionParams = '') {
  return wrapCommand(CMD.CUSTOM_DATA, {
    functionField,
    functionContent,
    functionParams
  })
}

export function createReboot() {
  return createCustomData('reboot', 'reboot', '')
}

export function createParamInit() {
  return createCustomData('paramInit', 'paramInit', '')
}

export function createFaultInfoQuery(faultCode = '') {
  const data = {}
  if (faultCode) data.faultCode = faultCode
  return wrapCommand(CMD.FAULT_INFO, data)
}

export function createHistoryQuery(historyType, startIndex, fetchCount, queryId) {
  return wrapCommand(CMD.HISTORY_OPERATIONS, {
    subCommand: 'Query',
    historyType,
    startIndex,
    fetchCount,
    queryId
  })
}

export function createFileQuery(path) {
  return wrapCommand(CMD.FILE_OPERATIONS, {
    subCommand: 'Query',
    path
  })
}

/** 固件升级响应（设备 → 客户端） */
export const FIRMWARE_RESPONSE = {
  ACK: 0,
  NACK: 1,
  COMPLETED: 2,
  ERROR: 3
}

/** 固件升级结束状态（客户端 → 设备 End 命令） */
export const FIRMWARE_STATUS = {
  IDLE: 0,
  START: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  FAILED: 4,
  CANCELLED: 5
}

export function firmwarePacketCrc(bytes) {
  let crc = 0
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc + bytes[i]) & 0xffff
  }
  return crc
}

export function createFirmwareUpgradeStart(fileSize, totalPackets, packetSize, firmwareVersion) {
  return wrapCommand(CMD.FIRMWARE_UPGRADE, {
    subCommand: 'Start',
    fileSize: Number(fileSize),
    totalPackets: Number(totalPackets),
    packetSize: Number(packetSize),
    firmwareVersion: String(firmwareVersion || '')
  })
}

export function createFirmwareUpgradeData(packetIndex, totalPackets, base64Data, crc) {
  return wrapCommand(CMD.FIRMWARE_UPGRADE, {
    subCommand: 'Data',
    packetIndex: Number(packetIndex),
    totalPackets: Number(totalPackets),
    data: base64Data,
    crc: Number(crc) || 0
  })
}

export function createFirmwareUpgradeEnd(status = FIRMWARE_STATUS.COMPLETED, errorMessage = '') {
  return wrapCommand(CMD.FIRMWARE_UPGRADE, {
    subCommand: 'End',
    status: Number(status),
    errorMessage: String(errorMessage || '')
  })
}

export function isDeviceHeartbeat(json) {
  return (
    json?.command === CMD.HEARTBEAT &&
    String(json?.data?.source || '') === HEARTBEAT_SOURCE.DEVICE
  )
}
