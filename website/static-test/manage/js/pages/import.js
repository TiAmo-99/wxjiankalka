(function () {
  var U = window.AdminUtils
  var students = []
  var file = null

  function selectedStudent() {
    var id = document.getElementById('user-id').value
    return students.find(function (s) {
      return String(s.id) === String(id)
    })
  }

  function updateTip() {
    var s = selectedStudent()
    var tip = document.getElementById('selected-tip')
    tip.textContent = s
      ? '当前学员：' + s.nickname + (s.realName ? '（' + s.realName + '）' : '')
      : ''
  }

  function loadStudents() {
    return window.AdminApi.request('/admin/users?page=1&pageSize=500&status=active').then(function (data) {
      students = data.list || []
      var sel = document.getElementById('user-id')
      sel.innerHTML =
        '<option value="">请选择学员…</option>' +
        students
          .map(function (s) {
            return (
              '<option value="' +
              s.id +
              '">' +
              U.esc(s.nickname) +
              (s.realName ? '（' + U.esc(s.realName) + '）' : '') +
              ' · ID ' +
              s.id +
              '</option>'
            )
          })
          .join('')
      updateTip()
    })
  }

  document.getElementById('user-id').onchange = function () {
    file = null
    document.getElementById('file').value = ''
    document.getElementById('file-name').textContent = ''
    document.getElementById('result-panel').hidden = true
    updateTip()
  }

  document.getElementById('btn-refresh').onclick = function () {
    loadStudents().catch(function (e) {
      alert(e.message)
    })
  }

  document.getElementById('btn-download').onclick = function () {
    var uid = document.getElementById('user-id').value
    if (!uid) {
      alert('请先选择学员')
      return
    }
    var s = selectedStudent()
    var btn = document.getElementById('btn-download')
    btn.disabled = true
    window.AdminApi.downloadFile(
      '/admin/plan-items/import-template?userId=' + uid,
      '学习任务导入_' + (s ? s.nickname : uid) + '.xlsx'
    )
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        btn.disabled = false
      })
  }

  document.getElementById('file').onchange = function (e) {
    file = e.target.files[0] || null
    document.getElementById('file-name').textContent = file ? '已选：' + file.name : ''
    document.getElementById('result-panel').hidden = true
  }

  document.getElementById('btn-upload').onclick = function () {
    var uid = document.getElementById('user-id').value
    if (!uid || !file) return
    var btn = document.getElementById('btn-upload')
    btn.disabled = true
    btn.textContent = '导入中…'
    window.AdminApi.uploadFile('/admin/plan-items/import', file, { userId: uid })
      .then(function (result) {
        var panel = document.getElementById('result-panel')
        panel.hidden = false
        var errRows = ''
        if (result.errors && result.errors.length) {
          errRows = result.errors
            .map(function (err) {
              return '<tr><td>第 ' + err.row + ' 行</td><td>' + U.esc(err.message) + '</td></tr>'
            })
            .join('')
        }
        panel.innerHTML =
          '<h3>导入结果（' +
          U.esc(result.studentName) +
          '）</h3><p>成功 <strong>' +
          result.success +
          '</strong> 条，失败 <strong>' +
          result.failed +
          '</strong> 条</p>' +
          (errRows
            ? '<div class="table-wrap"><table><thead><tr><th>行号</th><th>原因</th></tr></thead><tbody>' +
              errRows +
              '</tbody></table></div>'
            : '')
        file = null
        document.getElementById('file').value = ''
      })
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        btn.disabled = false
        btn.textContent = '开始导入'
      })
  }

  loadStudents().catch(function (e) {
    alert(e.message)
  })
})()
