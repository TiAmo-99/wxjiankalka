const TOKEN_KEY = 'admin_token'

const baseURL = import.meta.env.VITE_API_BASE || '/api/v1'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${baseURL}${url}`, {
    ...options,
    headers
  })

  const body = await res.json().catch(() => ({}))

  if (body.code !== undefined && body.code !== 0) {
    if (body.code >= 20001 && body.code < 20100) {
      clearToken()
      if (!options.skipAuthRedirect) {
        window.location.hash = '#/login'
      }
    }
    throw new Error(body.message || '请求失败')
  }

  if (!res.ok && body.code === undefined) {
    throw new Error('网络异常')
  }

  return body.data !== undefined ? body.data : body
}

export function login(username, password) {
  return request('/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuthRedirect: true
  })
}

export async function downloadFile(url, filename) {
  const token = getToken()
  const res = await fetch(`${baseURL}${url}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  const ct = res.headers.get('content-type') || ''
  if (!res.ok || ct.includes('application/json')) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || '下载失败')
  }
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function uploadFile(url, file, fields = {}) {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  Object.entries(fields).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v))
  })
  const res = await fetch(`${baseURL}${url}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form
  })
  const body = await res.json().catch(() => ({}))
  if (body.code !== undefined && body.code !== 0) {
    throw new Error(body.message || '上传失败')
  }
  return body.data !== undefined ? body.data : body
}
