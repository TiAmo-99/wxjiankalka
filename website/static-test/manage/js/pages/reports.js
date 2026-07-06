(function () {
  var U = window.AdminUtils
  var page = 1
  var pageSize = 20
  var total = 0

  function defaultRange() {
    var to = new Date()
    var from = new Date()
    from.setDate(from.getDate() - 6)
    return { from: U.isoDate(from), to: U.isoDate(to) }
  }

  var dr = defaultRange()
  document.getElementById('from').value = dr.from
  document.getElementById('to').value = dr.to

  function setRange(days) {
    var end = new Date()
    var start = new Date()
    start.setDate(start.getDate() - (days - 1))
    document.getElementById('from').value = U.isoDate(start)
    document.getElementById('to').value = U.isoDate(end)
    page = 1
    load()
  }

  function load() {
    var tbody = document.getElementById('tbody')
    tbody.innerHTML = '<tr><td colspan="10">加载中…</td></tr>'
    var q = new URLSearchParams({
      from: document.getElementById('from').value,
      to: document.getElementById('to').value,
      keyword: document.getElementById('keyword').value,
      page: String(page),
      pageSize: String(pageSize)
    })
    window.AdminApi.request('/admin/reports?' + q)
      .then(function (data) {
        var list = data.list || []
        total = data.total ?? 0
        document.getElementById('summary').textContent =
          '共 ' + total + ' 条（当前页 ' + list.length + ' 条）'
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="10">该时间段暂无上报</td></tr>'
        } else {
          tbody.innerHTML = list
            .map(function (row) {
              return (
                '<tr><td>' +
                U.esc(row.reportDate) +
                '</td><td>' +
                U.esc(row.nickname) +
                (row.realName ? '（' + U.esc(row.realName) + '）' : '') +
                '</td><td>' +
                U.esc(row.subject) +
                '</td><td class="content-cell">' +
                U.esc(row.content || '—') +
                '</td><td>' +
                row.targetMinutes +
                '</td><td>' +
                row.actualMinutes +
                '</td><td>' +
                (row.startTime ? U.esc(row.startTime) + '–' + U.esc(row.endTime || '?') : '—') +
                '</td><td><span class="tag ' +
                (row.completed ? 'tag-ok' : 'tag-warn') +
                '">' +
                (row.completed ? '是' : '否') +
                '</span></td><td class="content-cell">' +
                U.esc(row.note || '—') +
                '</td><td>' +
                U.esc(row.createdAt) +
                '</td></tr>'
              )
            })
            .join('')
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
  document.querySelectorAll('[data-range]').forEach(function (btn) {
    btn.onclick = function () {
      setRange(Number(btn.getAttribute('data-range')))
    }
  })
  document.getElementById('btn-export').onclick = function () {
    var q = new URLSearchParams({
      from: document.getElementById('from').value,
      to: document.getElementById('to').value,
      keyword: document.getElementById('keyword').value
    })
    var btn = document.getElementById('btn-export')
    btn.disabled = true
    window.AdminApi.downloadFile(
      '/admin/reports/export?' + q,
      '学习上报_' + document.getElementById('from').value + '_' + document.getElementById('to').value + '.xlsx'
    )
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        btn.disabled = false
      })
  }

  load()
})()
