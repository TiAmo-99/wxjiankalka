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
