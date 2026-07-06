(function () {
  var U = window.AdminUtils

  function load() {
    var tbody = document.getElementById('tbody')
    tbody.innerHTML = '<tr><td colspan="5">加载中…</td></tr>'
    window.AdminApi.request('/admin/encouragements')
      .then(function (data) {
        var list = data.list || []
        if (!list.length) {
          tbody.innerHTML = '<tr><td colspan="5">暂无鼓励语</td></tr>'
          return
        }
        tbody.innerHTML = list
          .map(function (row) {
            return (
              '<tr><td>' +
              row.id +
              '</td><td class="content-cell">' +
              U.esc(row.content) +
              '</td><td>' +
              row.sortOrder +
              '</td><td><span class="tag ' +
              (row.status === 'active' ? 'tag-ok' : 'tag-off') +
              '">' +
              (row.status === 'active' ? '展示中' : '已停用') +
              '</span></td><td class="actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-toggle="' +
              row.id +
              '">' +
              (row.status === 'active' ? '停用' : '启用') +
              '</button> ' +
              '<button type="button" class="btn btn-danger btn-sm" data-del="' +
              row.id +
              '">删除</button></td></tr>'
            )
          })
          .join('')
        list.forEach(function (row) {
          tbody.querySelector('[data-toggle="' + row.id + '"]').onclick = function () {
            window.AdminApi.request('/admin/encouragements/' + row.id, {
              method: 'PATCH',
              body: JSON.stringify({ status: row.status === 'active' ? 'disabled' : 'active' })
            })
              .then(load)
              .catch(function (e) {
                alert(e.message)
              })
          }
          tbody.querySelector('[data-del="' + row.id + '"]').onclick = function () {
            if (!confirm('确定删除？\n' + row.content)) return
            window.AdminApi.request('/admin/encouragements/' + row.id, { method: 'DELETE' })
              .then(load)
              .catch(function (e) {
                alert(e.message)
              })
          }
        })
      })
      .catch(function (e) {
        alert(e.message)
      })
  }

  document.getElementById('btn-add').onclick = function () {
    var content = document.getElementById('content').value.trim()
    if (!content) {
      alert('请填写内容')
      return
    }
    var btn = document.getElementById('btn-add')
    btn.disabled = true
    window.AdminApi.request('/admin/encouragements', {
      method: 'POST',
      body: JSON.stringify({
        content: content,
        sortOrder: Number(document.getElementById('sort-order').value) || 0
      })
    })
      .then(function () {
        document.getElementById('content').value = ''
        document.getElementById('sort-order').value = '0'
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
