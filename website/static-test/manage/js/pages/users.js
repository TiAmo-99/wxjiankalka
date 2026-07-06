(function () {
  var U = window.AdminUtils
  var page = 1
  var pageSize = 20
  var total = 0
  var permTarget = null

  function load() {
    var kw = document.getElementById('keyword').value
    var st = document.getElementById('status').value
    var tbody = document.getElementById('tbody')
    tbody.innerHTML = '<tr><td colspan="9">加载中…</td></tr>'
    window.AdminApi.request(
      '/admin/users?page=' +
        page +
        '&pageSize=' +
        pageSize +
        '&keyword=' +
        encodeURIComponent(kw) +
        '&status=' +
        encodeURIComponent(st)
    )
      .then(function (data) {
        var list = data.list || []
        total = data.total || 0
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="9">暂无学员</td></tr>'
        } else {
          tbody.innerHTML = list
            .map(function (row) {
              return (
                '<tr>' +
                '<td>' +
                row.id +
                '</td>' +
                '<td>' +
                U.esc(row.nickname) +
                '</td>' +
                '<td>' +
                U.esc(row.realName || '—') +
                '</td>' +
                '<td>' +
                U.esc(row.phone || '—') +
                '</td>' +
                '<td>L' +
                (row.permLevel ?? 0) +
                '</td>' +
                '<td><span class="tag ' +
                (row.hasWechat ? 'tag-ok' : 'tag-warn') +
                '">' +
                (row.hasWechat ? '已绑定' : '未绑定') +
                '</span></td>' +
                '<td><span class="tag ' +
                (row.status === 'active' ? 'tag-ok' : 'tag-off') +
                '">' +
                (row.status === 'active' ? '正常' : '禁用') +
                '</span></td>' +
                '<td>' +
                U.esc(row.createdAt || '—') +
                '</td>' +
                '<td class="actions">' +
                '<a class="btn btn-ghost btn-sm" href="user-plans.html?id=' +
                row.id +
                '">配置任务</a> ' +
                '<button type="button" class="btn btn-primary btn-sm" data-perm="' +
                row.id +
                '">修改权限</button>' +
                '</td></tr>'
              )
            })
            .join('')
          tbody.querySelectorAll('[data-perm]').forEach(function (btn) {
            btn.onclick = function () {
              var id = Number(btn.getAttribute('data-perm'))
              permTarget = list.find(function (r) {
                return r.id === id
              })
              if (!permTarget) return
              document.getElementById('perm-meta').textContent =
                permTarget.nickname +
                ' · 手机 ' +
                (permTarget.phone || '—') +
                ' · 当前 L' +
                (permTarget.permLevel ?? 0)
              document.getElementById('perm-input').value = permTarget.permLevel ?? 0
              U.openModal('modal-perm')
            }
          })
        }
        U.renderPager(document.getElementById('pager'), page, pageSize, total, function (p) {
          page = p
          load()
        })
      })
      .catch(function (e) {
        alert(e.message)
      })
  }

  document.getElementById('btn-search').onclick = function () {
    page = 1
    load()
  }
  document.getElementById('keyword').onkeyup = function (e) {
    if (e.key === 'Enter') {
      page = 1
      load()
    }
  }
  document.getElementById('status').onchange = function () {
    page = 1
    load()
  }

  document.querySelectorAll('[data-close]').forEach(function (el) {
    el.onclick = function () {
      U.closeModal(el.getAttribute('data-close'))
    }
  })
  document.getElementById('modal-perm').onclick = function (e) {
    if (e.target === document.getElementById('modal-perm')) U.closeModal('modal-perm')
  }

  document.getElementById('perm-save').onclick = function () {
    if (!permTarget) return
    var btn = document.getElementById('perm-save')
    btn.disabled = true
    window.AdminApi.request('/admin/users/' + permTarget.id + '/perm-level', {
      method: 'PATCH',
      body: JSON.stringify({ permLevel: Number(document.getElementById('perm-input').value) })
    })
      .then(function () {
        U.closeModal('modal-perm')
        load()
      })
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        btn.disabled = false
      })
  }

  load()
})()
