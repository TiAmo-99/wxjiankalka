(function () {
  var TOKEN_KEY = window.ADMIN_CONFIG.tokenKey

  function baseURL() {
    return window.ADMIN_CONFIG.apiBase
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || ''
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token)
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY)
  }

  function loginPage() {
    var path = location.pathname
    if (path.indexOf('login') !== -1) return 'login.html'
    var base = path.replace(/[^/]+$/, '')
    return base + 'login.html'
  }

  async function request(url, options) {
    options = options || {}
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {})
    var token = getToken()
    if (token) headers.Authorization = 'Bearer ' + token

    var res = await fetch(baseURL() + url, Object.assign({}, options, { headers: headers }))
    var body = await res.json().catch(function () {
      return {}
    })

    if (body.code !== undefined && body.code !== 0) {
      if (body.code >= 20001 && body.code < 20100) {
        clearToken()
        if (!options.skipAuthRedirect) {
          location.href = loginPage()
        }
      }
      throw new Error(body.message || '请求失败')
    }

    if (!res.ok && body.code === undefined) {
      throw new Error('网络异常')
    }

    return body.data !== undefined ? body.data : body
  }

  async function login(username, password) {
    return request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ username: username, password: password }),
      skipAuthRedirect: true
    })
  }

  async function downloadFile(url, filename) {
    var token = getToken()
    var res = await fetch(baseURL() + url, {
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    })
    var ct = res.headers.get('content-type') || ''
    if (!res.ok || ct.indexOf('application/json') !== -1) {
      var body = await res.json().catch(function () {
        return {}
      })
      throw new Error(body.message || '下载失败')
    }
    var blob = await res.blob()
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function uploadFile(url, file, fields) {
    var token = getToken()
    var form = new FormData()
    form.append('file', file)
    Object.keys(fields || {}).forEach(function (k) {
      var v = fields[k]
      if (v !== undefined && v !== null && v !== '') form.append(k, String(v))
    })
    var res = await fetch(baseURL() + url, {
      method: 'POST',
      headers: token ? { Authorization: 'Bearer ' + token } : {},
      body: form
    })
    var body = await res.json().catch(function () {
      return {}
    })
    if (body.code !== undefined && body.code !== 0) {
      throw new Error(body.message || '上传失败')
    }
    return body.data !== undefined ? body.data : body
  }

  window.AdminApi = {
    request: request,
    login: login,
    downloadFile: downloadFile,
    uploadFile: uploadFile,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken
  }
})()
