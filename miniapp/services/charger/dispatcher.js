import { handleFirmwareUpgradeResponse } from './firmware-upgrade.js'
import { CMD, validateProtocol, isDeviceHeartbeat, createClientHeartbeat } from './protocol.js'
import {
  systemInfo,
  guns,
  faults,
  setGunInfo,
  appendCommLog,
  mergeParamQueryResponse,
  setParamModifyResult,
  paramState
} from './charger-store.js'

function pickNum(obj, key, def = 0) {
  const v = obj?.[key]
  return v === undefined || v === null ? def : Number(v)
}

function pickStr(obj, key, def = '') {
  const v = obj?.[key]
  return v === undefined || v === null ? def : String(v)
}

function handleSystemInfo(data) {
  systemInfo.systemModel = pickStr(data, 'systemModel')
  systemInfo.hardwareVersion =
    pickStr(data, 'hardwareVersion') || pickStr(data, 'hwVersion') || pickStr(data, 'hardware')
  const sw = pickStr(data, 'softwareVersion') || pickStr(data, 'version')
  systemInfo.softwareVersion = sw
  systemInfo.version = sw
  systemInfo.gunCount = pickNum(data, 'gunCount')
  systemInfo.devicePower = pickNum(data, 'devicePower')
  systemInfo.networkStatus = pickNum(data, 'networkStatus')
  systemInfo.faultCount = pickNum(data, 'faultCount')
  systemInfo.updatedAt = Date.now()
}

function handleGunInfo(data) {
  setGunInfo({
    gunNumber: pickNum(data, 'gunNumber'),
    chargingStatus: pickNum(data, 'chargingStatus'),
    gunConnectionStatus: pickNum(data, 'gunConnectionStatus'),
    demandVoltage: pickNum(data, 'demandVoltage'),
    demandCurrent: pickNum(data, 'demandCurrent'),
    actualVoltage: pickNum(data, 'actualVoltage'),
    actualCurrent: pickNum(data, 'actualCurrent'),
    energy: pickNum(data, 'energy'),
    cost: pickNum(data, 'cost'),
    batterySOC: pickNum(data, 'batterySOC'),
    chargingTime: pickNum(data, 'chargingTime'),
    userId: pickStr(data, 'userId'),
    orderNumber: pickStr(data, 'orderNumber')
  })
}

function handleFaultInfo(data) {
  const list = data?.faults || data?.faultList || []
  faults.value = Array.isArray(list) ? list : []
}

export function dispatchJsonMessage(json, hooks = {}) {
  const { onReply } = hooks
  const v = validateProtocol(json)
  if (!v.ok) {
    appendCommLog({
      dir: 'RX',
      mode: 'warn',
      text: `协议校验: ${v.message}`
    })
    return
  }

  const cmd = json.command
  const data = json.data || {}

  switch (cmd) {
    case CMD.SYSTEM_INFO:
      handleSystemInfo(data)
      break
    case CMD.GUN_INFO:
      handleGunInfo(data)
      break
    case CMD.FAULT_INFO:
      handleFaultInfo(data)
      break
    case CMD.HEARTBEAT:
      if (isDeviceHeartbeat(json) && typeof onReply === 'function') {
        const seq = Number(json.data?.sequence) || 0
        onReply(createClientHeartbeat(seq))
      }
      break
    case CMD.PARAM_QUERY:
      mergeParamQueryResponse(data, paramState.querySession)
      appendCommLog({
        dir: 'RX',
        mode: 'text',
        text: `ParamQuery/${data?.type || ''} +${(data?.params || []).length} → 累计 ${paramState.totalCount}（${paramState.packetsReceived}包）`
      })
      break
    case CMD.PARAM_MODIFY:
      setParamModifyResult(data)
      break
    case CMD.FIRMWARE_UPGRADE:
      handleFirmwareUpgradeResponse(data)
      break
    case CMD.CHARGE_CONTROL:
    case CMD.FILE_OPERATIONS:
    case CMD.HISTORY_OPERATIONS:
    case CMD.CUSTOM_DATA:
    default:
      break
  }
}
