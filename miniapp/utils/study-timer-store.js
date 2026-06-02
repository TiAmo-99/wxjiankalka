/** 学习任务计时本地持久化（按日期 + 任务维度） */

const STORE_KEY = 'study_timer_sessions'

export function buildTimerSessionKey(reportDate, mode, planItemId) {
  if (mode === 'plan' && planItemId != null && planItemId !== '') {
    return `${reportDate}:plan:${String(planItemId)}`
  }
  return `${reportDate}:other`
}

function readAll() {
  try {
    const raw = uni.getStorageSync(STORE_KEY)
    if (!raw) return {}
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
    return typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function writeAll(map) {
  try {
    uni.setStorageSync(STORE_KEY, JSON.stringify(map))
  } catch (e) {
    console.warn('save timer sessions failed', e)
  }
}

/** 清理非今日条目，避免堆积 */
export function pruneTimerSessions(today) {
  const map = readAll()
  let changed = false
  Object.keys(map).forEach((key) => {
    if (!key.startsWith(`${today}:`)) {
      delete map[key]
      changed = true
    }
  })
  if (changed) writeAll(map)
}

export function loadTimerSession(key) {
  if (!key) return null
  const data = readAll()[key]
  if (!data) return null
  return data
}

export function saveTimerSession(key, payload) {
  if (!key) return
  const map = readAll()
  map[key] = {
    ...payload,
    updatedAt: Date.now()
  }
  writeAll(map)
}

export function clearTimerSession(key) {
  if (!key) return
  const map = readAll()
  if (!map[key]) return
  delete map[key]
  writeAll(map)
}
