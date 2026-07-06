(function () {
  var U = window.AdminUtils
  var page = 1
  var pageSize = 20
  var total = 0
  var reviewRow = null

  function statusLabel(s) {
    if (s === 'pending') return '待审核'
    if (s === 'approved') return '已通过'
    if (s === 'rejected') return '已拒绝'
    return s
  }

  function statusClass(s) {
    if (s === 'pending') return 'tag-warn'
    if (s === 'approved') return 'tag-ok'
    if (s === 'rejected') return 'tag-off'
    return ''
  }

  function load() {
    var tbody = document.getElementById('tbody')
    tbody.innerHTML = '<tr><td colspan="9">加载中…</td></tr>'
    var st = document.getElementById('status').value
    window.AdminApi.request(
      '/admin/permission-requests?page=' + page + '&pageSize=' + pageSize + '&status=' + encodeURIComponent(st)
    )
      .then(function (data) {
        var list = data.list || []
        total = data.total || 0
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="9">暂无申请</td></tr>'
        } else {
          tbody.innerHTML = list
            .map(function (row) {
              return (
                '<tr><td>' +
                row.id +
                '</td><td>' +
                U.esc(row.nickname) +
                '</td><td>' +
                U.esc(row.phone || '—') +
                '</td><td>L' +
                row.currentPermLevel +
                '</td><td>L' +
                row.requestLevel +
                '</td><td class="content-cell">' +
                U.esc(row.reason) +
                '</td><td><span class="tag ' +
                statusClass(row.status) +
                '">' +
                statusLabel(row.status) +
                '</span></td><td>' +
                U.esc(row.createdAt || '—') +
                '</td><td>' +
                (row.status === 'pending'
                  ? '<button type="button" class="btn btn-primary btn-sm" data-review="' + row.id + '">处理</button>'
                  : '<span style="font-size:12px;color:#9ca3af">' + U.esc(row.adminNote || '—') + '</span>') +
                '</td></tr>'
              )
            })
            .join('')
          list.forEach(function (row) {
            var btn = tbody.querySelector('[data-review="' + row.id + '"]')
            if (btn) {
              btn.onclick = function () {
                reviewRow = row
                document.getElementById('review-title').textContent = '处理申请 #' + row.id
                document.getElementById('review-meta').textContent =
                  row.nickname + ' · L' + row.currentPermLevel + ' → 申请 L' + row.requestLevel
                document.getElementById('review-reason').textContent = row.reason
                document.getElementById('review-level').value = row.requestLevel
                document.getElementById('review-note').value = ''
                U.openModal('modal-review')
              }
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

  function submitReview(approved) {
    if (!reviewRow) return
    var body = {
      action: approved ? 'approve' : 'reject',
      adminNote: document.getElementById('review-note').value
    }
    if (approved) body.permLevel = Number(document.getElementById('review-level').value)
    window.AdminApi.request('/admin/permission-requests/' + reviewRow.id, {
      method: 'PATCH',
      body: JSON.stringify(body)
    })
      .then(function () {
        U.closeModal('modal-review')
        reviewRow = null
        load()
      })
      .catch(function (e) {
        alert(e.message)
      })
  }

  document.getElementById('btn-load').onclick = function () {
    page = 1
    load()
  }
  document.getElementById('status').onchange = function () {
    page = 1
    load()
  }
  document.querySelector('[data-close]').onclick = function () {
    U.closeModal('modal-review')
  }
  document.getElementById('review-reject').onclick = function () {
    submitReview(false)
  }
  document.getElementById('review-approve').onclick = function () {
    submitReview(true)
  }

  load()
})()
