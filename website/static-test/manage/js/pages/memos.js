(function () {
  var U = window.AdminUtils
  var page = 1
  var pageSize = 20
  var total = 0
  var editing = false
  var editId = null

  function preview(text) {
    var s = String(text || '').replace(/\s+/g, ' ').trim()
    if (!s) return '（无内容）'
    return s.length > 60 ? s.slice(0, 60) + '…' : s
  }

  function loadStats() {
    return window.AdminApi.request('/admin/memos/stats').then(function (s) {
      s = s || { total: 0, todayCreated: 0 }
      document.getElementById('stats-row').innerHTML =
        '<div class="stat-card"><span class="stat-label">总数</span><span class="stat-value">' +
        s.total +
        '</span></div>' +
        '<div class="stat-card ok"><span class="stat-label">今日新增</span><span class="stat-value">' +
        s.todayCreated +
        '</span></div>'
    })
  }

  function load() {
    var tbody = document.getElementById('tbody')
    tbody.innerHTML = '<tr><td colspan="6">加载中…</td></tr>'
    var qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      keyword: document.getElementById('keyword').value.trim()
    })
    var uid = document.getElementById('user-id').value
    if (uid) qs.set('userId', uid)
    window.AdminApi.request('/admin/memos?' + qs)
      .then(function (data) {
        var list = data.list || []
        total = data.total || 0
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="6">暂无备忘录</td></tr>'
        } else {
          tbody.innerHTML = list
            .map(function (row) {
              return (
                '<tr><td>' +
                row.id +
                '</td><td><div style="font-weight:600">' +
                U.esc(row.userNickname || '—') +
                '</div><div style="font-size:12px;color:#6b7280">ID ' +
                row.userId +
                '</div></td><td>' +
                U.esc(row.title || '（无标题）') +
                '</td><td class="content-cell">' +
                U.esc(preview(row.content)) +
                '</td><td>' +
                U.esc(row.updatedAt || row.createdAt || '—') +
                '</td><td class="actions">' +
                '<button type="button" class="btn btn-ghost btn-sm" data-edit="' +
                row.id +
                '">编辑</button> ' +
                '<button type="button" class="btn btn-danger btn-sm" data-del="' +
                row.id +
                '">删除</button></td></tr>'
              )
            })
            .join('')
          list.forEach(function (row) {
            tbody.querySelector('[data-edit="' + row.id + '"]').onclick = function () {
              openEdit(row)
            }
            tbody.querySelector('[data-del="' + row.id + '"]').onclick = function () {
              if (!confirm('确定删除备忘录 #' + row.id + '？')) return
              window.AdminApi.request('/admin/memos/' + row.id, { method: 'DELETE' })
                .then(function () {
                  load()
                  loadStats()
                })
                .catch(function (e) {
                  alert(e.message)
                })
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

  function openCreate() {
    editing = false
    editId = null
    document.getElementById('memo-title-h').textContent = '新建备忘录'
    document.getElementById('memo-meta').textContent = ''
    document.getElementById('memo-user-field').hidden = false
    document.getElementById('f-user-id').value = ''
    document.getElementById('f-title').value = ''
    document.getElementById('f-content').value = ''
    U.openModal('modal-memo')
  }

  function openEdit(row) {
    editing = true
    editId = row.id
    document.getElementById('memo-title-h').textContent = '编辑备忘录'
    document.getElementById('memo-meta').textContent =
      '学员：' + (row.userNickname || '—') + '（ID ' + row.userId + '）'
    document.getElementById('memo-user-field').hidden = true
    document.getElementById('f-title').value = row.title || ''
    document.getElementById('f-content').value = row.content || ''
    U.openModal('modal-memo')
  }

  document.getElementById('btn-search').onclick = function () {
    page = 1
    load()
  }
  document.getElementById('btn-create').onclick = openCreate
  document.querySelector('[data-close]').onclick = function () {
    U.closeModal('modal-memo')
  }

  document.getElementById('memo-save').onclick = function () {
    var content = document.getElementById('f-content').value.trim()
    if (!content) {
      alert('请填写内容')
      return
    }
    var payload = {
      title: document.getElementById('f-title').value.trim(),
      content: content
    }
    var req
    if (editing) {
      req = window.AdminApi.request('/admin/memos/' + editId, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    } else {
      var uid = Number(document.getElementById('f-user-id').value)
      if (!uid) {
        alert('请填写学员 ID')
        return
      }
      payload.userId = uid
      req = window.AdminApi.request('/admin/memos', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    }
    document.getElementById('memo-save').disabled = true
    req
      .then(function () {
        U.closeModal('modal-memo')
        load()
        loadStats()
      })
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        document.getElementById('memo-save').disabled = false
      })
  }

  loadStats()
  load()
})()
