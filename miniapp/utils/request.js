import config from '@/config/index.js'

const TOKEN_KEY = 'token'

/** 演示模式下的上报记录（与 mock 计划联动） */
const mockReportRows = []
/** 演示模式下的备忘录 */
const mockMemoList = []
let mockPlanList = null

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

function notifyTokenChange() {
  if (typeof uni !== 'undefined' && uni.$emit) {
    uni.$emit('auth-token-change')
  }
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
  notifyTokenChange()
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
  notifyTokenChange()
}

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function initMockPlanList() {
  const today = todayStr()
  const d = new Date()
  const day = d.getDay() || 7
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + 1)
  const fmt = (x) => {
    const mm = `${x.getMonth() + 1}`.padStart(2, '0')
    const dd = `${x.getDate()}`.padStart(2, '0')
    return `${x.getFullYear()}-${mm}-${dd}`
  }
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(mon)
    x.setDate(mon.getDate() + i)
    weekDates.push(fmt(x))
  }
  const [t0, t1, t2, t3, t4, t5, t6] = weekDates
  mockPlanList = [
    { id: 1, subject: '政治', content: '复习马原第一章', date: t0, targetMinutes: 60, actualMinutes: 60, reported: true, startTime: '09:00', endTime: '10:00', note: '' },
    { id: 2, subject: '英语', content: '精读一篇', date: t1, targetMinutes: 45, actualMinutes: 30, reported: true, startTime: '14:00', endTime: '14:30', note: '' },
    { id: 3, subject: '数学', content: '高数习题 Ch.2', date: t2, targetMinutes: 90, actualMinutes: 120, reported: true, startTime: '19:00', endTime: '21:00', note: '超额完成' },
    { id: 4, subject: '政治', content: '复习马原第一章', date: today, targetMinutes: 60, actualMinutes: 0, reported: false },
    {
      id: 5,
      subject: '英语',
      content: '背诵单词 Unit 5',
      date: today,
      targetMinutes: 45,
      actualMinutes: 50,
      reported: true,
      startTime: '09:00',
      endTime: '09:50',
      note: '已完成单词打卡'
    },
    { id: 6, subject: '专业课', content: '真题阅读', date: t4, targetMinutes: 40, actualMinutes: 0, reported: false },
    { id: 7, subject: '数学', content: '线代总结', date: t5, targetMinutes: 50, actualMinutes: 0, reported: false },
    { id: 8, subject: '专业课', content: '模拟卷复盘', date: t6, targetMinutes: 120, actualMinutes: 0, reported: false }
  ]
}

function mockAllPlans() {
  if (!mockPlanList) initMockPlanList()
  return { list: mockPlanList }
}

function mockReportsFromPlans() {
  const rows = []
  for (const p of mockAllPlans().list) {
    if (!p.reported) continue
    rows.push({
      id: 10000 + p.id,
      planItemId: p.id,
      reportDate: p.date,
      completed: true,
      actualMinutes: p.actualMinutes || 0,
      startTime: p.startTime || '',
      endTime: p.endTime || '',
      note: p.note || '',
      subject: p.subject,
      content: p.content,
      isOther: false
    })
  }
  return rows
}

function parseQuery(url) {
  const q = {}
  const idx = url.indexOf('?')
  if (idx < 0) return q
  url
    .slice(idx + 1)
    .split('&')
    .forEach((pair) => {
      const [k, v] = pair.split('=')
      if (k) q[decodeURIComponent(k)] = decodeURIComponent(v || '')
    })
  return q
}

/** 开发 Mock（内置于 request，避免小程序分包未收录独立 mock 模块） */
function mockRequest(options) {
  const url = options.url
  const method = (options.method || 'GET').toUpperCase()

  return new Promise((resolve) => {
    setTimeout(() => {
      if (url === '/auth/wx-login' && method === 'POST') {
        resolve({
          token: 'dev-mock-token',
          nickname: '演示学员'
        })
        return
      }
      if (url === '/auth/wx-register' && method === 'POST') {
        resolve({
          token: 'dev-mock-token',
          nickname: options.data?.nickname || '新学员'
        })
        return
      }
      if (url === '/me' || url === '/auth/me') {
        resolve({ nickname: '演示学员' })
        return
      }
      if (url === '/stats/summary') {
        resolve({
          totalMinutes: 320,
          todayMinutes: 95,
          completedTasks: 8,
          weekMinutes: 180,
          streakDays: 3
        })
        return
      }
      if (url.startsWith('/plans/')) {
        const dateMatch = url.match(/[?&]date=([^&]+)/)
        const queryDate = dateMatch ? dateMatch[1] : todayStr()
        const all = mockAllPlans().list
        if (url.includes('/plans/today') || url.includes('/plans/day')) {
          const filtered = all.filter((item) => item.date === queryDate)
          resolve({ list: filtered.length ? filtered : all.filter((i) => i.date === todayStr()) })
          return
        }
        if (url.includes('/plans/week')) {
          const { start, end } = (() => {
            const dt = new Date()
            const day = dt.getDay() || 7
            const mon = new Date(dt)
            mon.setDate(dt.getDate() - day + 1)
            const sun = new Date(mon)
            sun.setDate(mon.getDate() + 6)
            const f = (x) => {
              const mm = `${x.getMonth() + 1}`.padStart(2, '0')
              const dd = `${x.getDate()}`.padStart(2, '0')
              return `${x.getFullYear()}-${mm}-${dd}`
            }
            return { start: f(mon), end: f(sun) }
          })()
          resolve({ list: all.filter((i) => i.date >= start && i.date <= end) })
          return
        }
        resolve({ list: all })
        return
      }
      if (url === '/plans/items' && method === 'POST') {
        const data = options.data || {}
        const list = mockAllPlans().list
        const nextId = Math.max(0, ...list.map((i) => i.id)) + 1
        const item = {
          id: nextId,
          subject: data.subject || '自学',
          content: data.content || '',
          date: data.date || todayStr(),
          targetMinutes: data.targetMinutes || 0,
          reported: false,
          actualMinutes: 0
        }
        list.push(item)
        resolve({ item })
        return
      }
      if (url.startsWith('/reports')) {
        if (url.includes('/today')) {
          const today = todayStr()
          const list = [...mockReportsFromPlans(), ...mockReportRows].filter((r) => r.reportDate === today)
          resolve({ list })
          return
        }
        if (method === 'GET') {
          const q = parseQuery(url)
          const from = q.from || '2000-01-01'
          const to = q.to || todayStr()
          let list = [...mockReportsFromPlans(), ...mockReportRows].filter(
            (r) => r.reportDate >= from && r.reportDate <= to
          )
          list.sort((a, b) => (a.reportDate < b.reportDate ? 1 : -1))
          const page = Math.max(Number(q.page) || 1, 1)
          const pageSize = Math.min(Math.max(Number(q.pageSize) || 30, 1), 100)
          const total = list.length
          const start = (page - 1) * pageSize
          list = list.slice(start, start + pageSize)
          resolve({ list, total, page, pageSize, from, to })
          return
        }
      }
      if (url.startsWith('/vocab/preview')) {
        const mockVocab = [
          { id: 1, word: 'achieve', phonetic: 'əˈtʃiːv', meaningZh: 'v. 达到；完成' },
          { id: 2, word: 'consistent', phonetic: 'kənˈsɪstənt', meaningZh: 'adj. 一致的；持续的' },
          { id: 3, word: 'strategy', phonetic: 'ˈstrætədʒi', meaningZh: 'n. 策略；战略' },
          { id: 4, word: 'significant', phonetic: 'sɪɡˈnɪfɪkənt', meaningZh: 'adj. 重要的；显著的' },
          { id: 5, word: 'maintain', phonetic: 'meɪnˈteɪn', meaningZh: 'v. 维持；坚持' },
          { id: 6, word: 'perspective', phonetic: 'pərˈspektɪv', meaningZh: 'n. 观点；透视' },
          { id: 7, word: 'fundamental', phonetic: 'ˌfʌndəˈmentl', meaningZh: 'adj. 基本的；根本的' },
          { id: 8, word: 'demonstrate', phonetic: 'ˈdemənstreɪt', meaningZh: 'v. 证明；演示' },
          { id: 9, word: 'contribute', phonetic: 'kənˈtrɪbjuːt', meaningZh: 'v. 贡献；捐献' },
          { id: 10, word: 'crucial', phonetic: 'ˈkruːʃl', meaningZh: 'adj. 关键的；决定性的' }
        ]
        const q = parseQuery(url.includes('?') ? url : `${url}?`)
        const count = Math.min(Math.max(Number(q.count) || 3, 1), 10)
        resolve({
          date: todayStr(),
          words: mockVocab.slice(0, count),
          empty: false
        })
        return
      }
      if (url.startsWith('/vocab/set')) {
        const mockVocab = [
          { id: 1, word: 'achieve', phonetic: 'əˈtʃiːv', meaningZh: 'v. 达到；完成' },
          { id: 2, word: 'consistent', phonetic: 'kənˈsɪstənt', meaningZh: 'adj. 一致的；持续的' },
          { id: 3, word: 'strategy', phonetic: 'ˈstrætədʒi', meaningZh: 'n. 策略；战略' },
          { id: 4, word: 'significant', phonetic: 'sɪɡˈnɪfɪkənt', meaningZh: 'adj. 重要的；显著的' },
          { id: 5, word: 'maintain', phonetic: 'meɪnˈteɪn', meaningZh: 'v. 维持；坚持' },
          { id: 6, word: 'perspective', phonetic: 'pərˈspektɪv', meaningZh: 'n. 观点；透视' },
          { id: 7, word: 'fundamental', phonetic: 'ˌfʌndəˈmentl', meaningZh: 'adj. 基本的；根本的' },
          { id: 8, word: 'demonstrate', phonetic: 'ˈdemənstreɪt', meaningZh: 'v. 证明；演示' },
          { id: 9, word: 'contribute', phonetic: 'kənˈtrɪbjuːt', meaningZh: 'v. 贡献；捐献' },
          { id: 10, word: 'crucial', phonetic: 'ˈkruːʃl', meaningZh: 'adj. 关键的；决定性的' }
        ]
        resolve({
          words: mockVocab,
          phrase: { id: 1, phraseEn: 'in terms of', meaningZh: '就…而言；在…方面' },
          empty: false
        })
        return
      }
      if ((url === '/memos' || url.startsWith('/memos?')) && method === 'GET') {
        const q = options.data && Object.keys(options.data).length ? options.data : parseQuery(url)
        const kw = String(q.keyword || '').trim().toLowerCase()
        let list = [...mockMemoList]
        if (kw) {
          list = list.filter(
            (m) =>
              String(m.title || '').toLowerCase().includes(kw) ||
              String(m.content || '').toLowerCase().includes(kw)
          )
        }
        const page = Math.max(Number(q.page) || 1, 1)
        const pageSize = Math.min(Math.max(Number(q.pageSize) || 30, 1), 100)
        const total = list.length
        const start = (page - 1) * pageSize
        resolve({
          list: list.slice(start, start + pageSize),
          total,
          page,
          pageSize
        })
        return
      }
      if (url === '/memos' && method === 'POST') {
        const data = options.data || {}
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const nextId = mockMemoList.length ? Math.max(...mockMemoList.map((m) => m.id)) + 1 : 1
        const item = {
          id: nextId,
          title: String(data.title || '').trim(),
          content: String(data.content || '').trim(),
          createdAt: now,
          updatedAt: now
        }
        mockMemoList.unshift(item)
        resolve(item)
        return
      }
      if (url.match(/^\/memos\/\d+$/) && method === 'GET') {
        const id = Number(url.split('/').pop())
        const item = mockMemoList.find((m) => m.id === id)
        if (!item) {
          resolve({ code: 30004, message: '备忘录不存在' })
          return
        }
        resolve(item)
        return
      }
      if (url.match(/^\/memos\/\d+$/) && method === 'PATCH') {
        const id = Number(url.split('/').pop())
        const idx = mockMemoList.findIndex((m) => m.id === id)
        if (idx < 0) {
          resolve({ code: 30004, message: '备忘录不存在' })
          return
        }
        const data = options.data || {}
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
        const cur = mockMemoList[idx]
        mockMemoList[idx] = {
          ...cur,
          title: data.title !== undefined ? String(data.title || '').trim() : cur.title,
          content: data.content !== undefined ? String(data.content || '').trim() : cur.content,
          updatedAt: now
        }
        resolve(mockMemoList[idx])
        return
      }
      if (url.match(/^\/memos\/\d+$/) && method === 'DELETE') {
        const id = Number(url.split('/').pop())
        const idx = mockMemoList.findIndex((m) => m.id === id)
        if (idx < 0) {
          resolve({ code: 30004, message: '备忘录不存在' })
          return
        }
        mockMemoList.splice(idx, 1)
        resolve({ ok: true })
        return
      }
      if (url === '/reports' && method === 'POST') {
        const data = options.data || {}
        const reportDate = data.reportDate || todayStr()
        const mins = Number(data.actualMinutes) || 0
        if (data.planItemId) {
          const item = mockAllPlans().list.find((i) => i.id === data.planItemId)
          if (item) {
            item.reported = true
            item.actualMinutes = mins
            item.startTime = data.startTime || item.startTime || ''
            item.endTime = data.endTime || item.endTime || ''
            item.note = data.note || ''
          }
        } else if (data.isOther) {
          mockReportRows.unshift({
            id: 20000 + mockReportRows.length,
            planItemId: null,
            reportDate,
            completed: Boolean(data.completed),
            actualMinutes: mins,
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            note: data.note || '',
            subject: data.otherSubject || '其他学习',
            content: data.otherContent || '',
            isOther: true
          })
        }
        resolve({
          id: Date.now(),
          reportDate,
          actualMinutes: mins,
          completed: Boolean(data.completed)
        })
        return
      }
      resolve({ list: [] })
    }, 200)
  })
}

function doUniRequest(options) {
  const token = getToken()
  const hadToken = !!token
  const showError = options.showError !== false
  const isAuthApi = /^\/auth\/(wx-login|wx-register)/.test(options.url || '')

  return new Promise((resolve, reject) => {
    uni.request({
      url: options.url.startsWith('http') ? options.url : `${config.baseUrl}${options.url}`,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
        ...options.header
      },
      success(res) {
        const body = res.data && typeof res.data === 'object' ? res.data : {}
        const bizCode = body.code

        if (bizCode !== undefined && bizCode !== 0) {
          const msg = body.message || '请求失败'
          if (bizCode >= 20001 && bizCode < 20100 && hadToken) {
            clearToken()
          }
          if (showError) {
            uni.showToast({ title: msg, icon: 'none' })
          }
          reject(body)
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body.data !== undefined ? body.data : body)
          return
        }

        if ((res.statusCode === 401 || res.statusCode === 403) && hadToken && !isAuthApi) {
          clearToken()
          if (showError) {
            uni.showToast({ title: body.message || '登录已失效，请重新登录', icon: 'none' })
          }
          reject(body.code ? body : { code: 20001, message: '请先登录' })
          return
        }

        if (res.statusCode === 401 || res.statusCode === 403) {
          if (showError && !isAuthApi) {
            uni.showToast({ title: body.message || '请先登录', icon: 'none' })
          }
          reject(body.code ? body : { code: 20001, message: body.message || '请先登录' })
          return
        }

        const httpMsg =
          body.message ||
          (typeof res.data === 'string' && res.data.slice(0, 80)) ||
          `服务器异常(HTTP ${res.statusCode})`
        if (showError) {
          uni.showToast({ title: httpMsg, icon: 'none', duration: 3000 })
        }
        reject({ code: res.statusCode || 50000, message: httpMsg })
      },
      fail(err) {
        const msg =
          err?.errMsg ||
          err?.message ||
          '无法连接服务器，请检查网络与小程序合法域名'
        reject({ code: 10002, message: msg, network: true })
      }
    })
  })
}

/**
 * 统一请求封装
 * @param {Object} options uni.request 参数；showError 默认 true；retry 网络失败重试次数（GET 默认 1）
 */
export async function request(options) {
  if (config.useMock) {
    return mockRequest(options)
  }

  const method = (options.method || 'GET').toUpperCase()
  const maxRetry =
    options.retry !== undefined ? options.retry : method === 'GET' ? 1 : 0
  const showLoading = options.showLoading === true

  if (showLoading) {
    uni.showLoading({ title: options.loadingText || '加载中', mask: true })
  }

  let lastErr
  const attempts = maxRetry + 1

  try {
    for (let i = 0; i < attempts; i++) {
      try {
        return await doUniRequest(options)
      } catch (e) {
        lastErr = e
        if (!e?.network || i >= attempts - 1) {
          if (options.showError !== false && e?.network && i >= attempts - 1) {
            uni.showToast({
              title: '网络不稳定，请稍后重试',
              icon: 'none',
              duration: 3000
            })
          } else if (options.showError !== false && !e?.network && e?.message && !e?.code) {
            uni.showToast({ title: e.message, icon: 'none' })
          }
          throw e
        }
        await new Promise((r) => setTimeout(r, 400))
      }
    }
    throw lastErr
  } finally {
    if (showLoading) {
      uni.hideLoading()
    }
  }
}
