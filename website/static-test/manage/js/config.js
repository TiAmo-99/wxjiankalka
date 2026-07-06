/**
 * API 根路径：同域部署用 /api/v1；官网静态站跨域用 server 域名。
 * 可在页面 <meta name="admin-api-base" content="https://server.jiankalka.cn/api/v1"> 覆盖。
 */
(function () {
  function detectApiBase() {
    var meta = document.querySelector('meta[name="admin-api-base"]')
    if (meta && meta.content.trim()) {
      return meta.content.trim().replace(/\/$/, '')
    }
    var host = location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return '/api/v1'
    }
    if (host.indexOf('server.') === 0 || host === 'server.jiankalka.cn') {
      return '/api/v1'
    }
    return 'https://server.jiankalka.cn/api/v1'
  }

  window.ADMIN_CONFIG = {
    apiBase: detectApiBase(),
    tokenKey: 'admin_token'
  }
})()
