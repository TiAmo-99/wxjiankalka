import { reactive, ref } from 'vue'

export const connection = reactive({
  state: 'idle', // idle | scanning | connecting | connected | error
  deviceId: '',
  deviceName: '',
  error: '',
  rssi: null,
  serviceId: '',
  writeId: '',
  notifyId: ''
})

export const systemInfo = reactive({
  systemModel: '',
  hardwareVersion: '',
  softwareVersion: '',
  gunCount: 0,
  devicePower: 0,
  networkStatus: 0,
  faultCount: 0,
  /** @deprecated 与 softwareVersion 同源，保留兼容 */
  version: '',
  updatedAt: 0
})

/** @type {Record<number, object>} */
export const guns = reactive({})

export const faults = ref([])

/** 参数查询/修改状态（对齐 Qt chargingmonitor 参数表） */
export const paramState = reactive({
  queryType: '',
  params: [],
  /** 已收到的分包数 */
  packetsReceived: 0,
  /** 当前列表项数 */
  totalCount: 0,
  /** 各包 count 累加（用于判断是否收齐） */
  expectedTotal: 0,
  /** @type {{type:string,received:number,processed:number,success:number,failed:number}|null} */
  lastModify: null,
  loading: false,
  /** 每次查询递增，用于忽略过期应答 */
  querySession: 0
})

/** @type {Record<string, number>} name -> index in paramState.params */
const paramRowByName = {}

export function clearParamTable(type = '') {
  paramState.queryType = type
  paramState.params = []
  paramState.packetsReceived = 0
  paramState.totalCount = 0
  paramState.expectedTotal = 0
  paramState.lastModify = null
  Object.keys(paramRowByName).forEach((k) => delete paramRowByName[k])
}

/** 发起新查询前调用，返回本次 session */
export function beginParamQuery(type) {
  paramState.querySession += 1
  clearParamTable(type)
  paramState.loading = true
  return paramState.querySession
}

function rebuildParamIndex() {
  Object.keys(paramRowByName).forEach((k) => delete paramRowByName[k])
  paramState.params.forEach((p, i) => {
    paramRowByName[p.name] = i
  })
}

function formatParamValue(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function pickParamDesc(obj) {
  return String(obj?.desc || obj?.decs || '')
}

/**
 * 合并 ParamQuery 响应（支持多包上送，按 name 去重追加）
 * @param {object} data
 * @param {number} [session] 查询 session，不匹配则忽略
 */
export function mergeParamQueryResponse(data, session) {
  const paramType = String(data?.type || '')
  const list = data?.params
  if (!Array.isArray(list) || !list.length) return

  if (session !== undefined && session !== paramState.querySession) return
  if (paramType && paramState.queryType && paramType !== paramState.queryType) return

  if (!paramState.queryType && paramType) {
    paramState.queryType = paramType
  }

  paramState.loading = true
  paramState.packetsReceived += 1
  const pktCount = Number(data?.count)
  if (Number.isFinite(pktCount) && pktCount > 0) {
    paramState.expectedTotal += pktCount
  } else {
    paramState.expectedTotal += list.length
  }

  const next = [...paramState.params]

  for (const item of list) {
    const name = String(item?.name || '')
    if (!name) continue

    const formatted = formatParamValue(item?.value)
    const row = {
      name,
      type: String(item?.type || 'string'),
      value: formatted,
      desc: pickParamDesc(item),
      editValue: formatted
    }

    const idx = paramRowByName[name]
    if (idx !== undefined && next[idx]) {
      const prev = next[idx]
      if (prev.editValue !== prev.value) row.editValue = prev.editValue
      next[idx] = { ...prev, ...row }
    } else {
      paramRowByName[name] = next.length
      next.push(row)
    }
  }

  paramState.params = next.map((p, i) => ({ ...p, seq: i + 1 }))
  paramState.totalCount = paramState.params.length
  rebuildParamIndex()
}

export function finishParamQueryLoading() {
  paramState.loading = false
}

export function setParamModifyResult(data) {
  paramState.lastModify = {
    type: String(data?.type || ''),
    received: Number(data?.received) || 0,
    processed: Number(data?.processed) || 0,
    success: Number(data?.success) || 0,
    failed: Number(data?.failed) || 0
  }
}

export function getModifiedParams() {
  return paramState.params.filter((p) => p.editValue !== p.value)
}

/** @type {import('vue').Ref<Array<{id:number,dir:'TX'|'RX',mode:string,text:string,time:string}>>} */
export const commLogs = ref([])

let logSeq = 0
const MAX_LOGS = 400

export function appendCommLog(entry) {
  logSeq += 1
  commLogs.value.unshift({
    id: logSeq,
    time: formatTime(new Date()),
    ...entry
  })
  if (commLogs.value.length > MAX_LOGS) {
    commLogs.value.length = MAX_LOGS
  }
}

export function clearCommLogs() {
  commLogs.value = []
}

function formatTime(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

export function resetRuntimeData() {
  systemInfo.systemModel = ''
  systemInfo.hardwareVersion = ''
  systemInfo.softwareVersion = ''
  systemInfo.gunCount = 0
  systemInfo.devicePower = 0
  systemInfo.networkStatus = 0
  systemInfo.faultCount = 0
  systemInfo.version = ''
  systemInfo.updatedAt = 0
  Object.keys(guns).forEach((k) => delete guns[k])
  faults.value = []
  clearParamTable()
}

export function setGunInfo(data) {
  const n = Number(data?.gunNumber)
  if (!n) return
  guns[n] = { ...guns[n], ...data, updatedAt: Date.now() }
}

export function gunList() {
  return Object.keys(guns)
    .map(Number)
    .sort((a, b) => a - b)
    .map((n) => guns[n])
}
