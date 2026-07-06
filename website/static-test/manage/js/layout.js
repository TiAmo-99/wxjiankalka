(function () {
  var NAV = [
    { href: '../index.html', label: '← 官网首页', external: true },
    { href: 'users.html', label: '学员管理' },
    { href: 'import.html', label: '批量导入' },
    { href: 'reports.html', label: '学习上报' },
    { href: 'encouragements.html', label: '鼓励话语' },
    { href: 'vocabulary.html', label: '英语词库' },
    { href: 'memos.html', label: '学员备忘录' },
    { href: 'permission-requests.html', label: '权限申请' }
  ]

  function isLoginPage() {
    return /login\.html$/i.test(location.pathname)
  }

  function guardAuth() {
    if (isLoginPage()) return
    if (!window.AdminApi.getToken()) {
      location.href = 'login.html'
    }
  }

  function currentFile() {
    var path = location.pathname
    var i = path.lastIndexOf('/')
    return i >= 0 ? path.slice(i + 1) : path
  }

  function mountSidebar() {
    var root = document.getElementById('admin-sidebar')
    if (!root) return
    var file = currentFile()
    var html =
      '<div class="brand">考研学习记录</div><nav>' +
      NAV.map(function (item) {
        var active = !item.external && file === item.href ? ' nav-item active' : ' nav-item'
        return '<a class="' + active.trim() + '" href="' + item.href + '">' + item.label + '</a>'
      }).join('') +
      '</nav><button type="button" class="logout" id="btn-logout">退出登录</button>'
    root.innerHTML = html
    document.getElementById('btn-logout').onclick = function () {
      window.AdminApi.clearToken()
      location.href = 'login.html'
    }
  }

  guardAuth()
  if (!isLoginPage()) {
    document.addEventListener('DOMContentLoaded', mountSidebar)
  }
})()
