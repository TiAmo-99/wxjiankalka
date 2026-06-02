import opsConfig from '@/config/ops-platform.js'

export function parseOpsJson(raw) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object') return raw
  let text = String(raw).replace(/^\uFEFF/, '').trim()
  if (!text) return null
  return JSON.parse(text)
}

function buildUrl(path, query = {}) {
  const base = opsConfig.baseUrl.replace(/\/$/, '')
  const qs = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return qs ? `${base}${path}?${qs}` : `${base}${path}`
}

export function opsPost(path, query = {}) {
  const url = buildUrl(path, query)
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      data: {},
      success(res) {
        try {
          const data = parseOpsJson(res.data)
          resolve(data)
        } catch (e) {
          reject(new Error('接口返回解析失败'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

/** 充电站列表 */
export function fetchStationList(loginId, name = '') {
  return opsPost(opsConfig.api.stationList, { loginId, name: name || '' })
}

/** 某站下充电桩列表 */
export function fetchPileList(stationId) {
  return opsPost(opsConfig.api.terminalList, { stationId })
}

/** 按桩编号查询调试信息 */
export function fetchPileDebug(cpcode, loginName) {
  return opsPost(opsConfig.api.pileDebug, { cpcode, loginName })
}
