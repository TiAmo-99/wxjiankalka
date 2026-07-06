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

export function createHeartbeat(sequence) {
  return wrapCommand(CMD.HEARTBEAT, {
    sequence,
    time: getCurrentTimestamp()
  })
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
  return wrapCommand(CMD.PARAM_MODIFY, { type: paramType, params })
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

export const CHARGING_STATUS_LABEL = {
  0: '空闲',
  1: '已连接',
  2: '充电中',
  3: '已完成',
  4: '故障'
}
