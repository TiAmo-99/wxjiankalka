(function () {
  var U = window.AdminUtils
  var userId = Number(U.queryParam('id'))
  if (!userId) {
    alert('缺少学员 ID')
    location.href = 'users.html'
    return
  }

  var student = null
  var selectedDate = U.todayISO()
  var emailSending = false

  function render() {
    var app = document.getElementById('app')
    if (!student) {
      app.innerHTML = '<p>加载中…</p>'
      return
    }
    app.innerHTML =
      '<div class="head"><a href="users.html">← 返回学员列表</a>' +
      '<h2>「' +
      U.esc(student.nickname) +
      '」的学习任务</h2>' +
      '<p class="toolbar" style="margin:0">' +
      '手机 ' +
      U.esc(student.phone || '—') +
      ' · 邮箱 ' +
      U.esc(student.email || '未填写') +
      ' · 权限 L' +
      (student.permLevel ?? 0) +
      ' · <span class="tag ' +
      (student.status === 'active' ? 'tag-ok' : 'tag-off') +
      '">' +
      (student.status === 'active' ? '正常' : '禁用') +
      '</span> ' +
      '<button type="button" class="btn btn-ghost btn-sm" id="btn-perm">修改权限</button> ' +
      '<button type="button" class="btn btn-primary btn-sm" id="btn-email"' +
      (!student.email ? ' disabled title="学员未填写邮箱"' : '') +
      '>邮箱提醒</button></p></div>' +
      '<div class="stats" id="stats-row"></div>' +
      '<div class="panel"><div class="toolbar panel-head">' +
      '<label>选择日期</label><input type="date" class="input" id="sel-date" value="' +
      selectedDate +
      '" />' +
      '<button type="button" class="btn btn-ghost" id="day-prev">前一天</button>' +
      '<button type="button" class="btn btn-ghost" id="day-next">后一天</button>' +
      '<button type="button" class="btn btn-ghost" id="day-today">今天</button></div>' +
      '<h3 id="items-title"></h3><div class="table-wrap"><table><thead><tr>' +
      '<th>科目</th><th>任务内容</th><th>目标(分)</th><th>上报</th><th>操作</th></tr></thead>' +
      '<tbody id="items-tbody"></tbody></table></div></div>' +
      '<div class="panel"><h3>添加任务</h3><div class="toolbar">' +
      '<input class="input" id="f-subject" placeholder="科目" />' +
      '<input class="input" id="f-content" placeholder="任务内容" style="flex:1;min-width:200px" />' +
      '<input class="input" id="f-minutes" type="number" placeholder="目标分钟" value="60" style="width:100px" />' +
      '<button type="button" class="btn btn-primary" id="btn-add">添加任务</button></div>' +
      '<p class="modal-meta">保存后学员在小程序「计划-今日」即可看到</p></div>'

    bindEvents()
    loadStats()
    loadItems()
  }

  function bindEvents() {
    document.getElementById('btn-perm').onclick = function () {
      document.getElementById('perm-meta').textContent =
        student.nickname + ' · 当前 L' + (student.permLevel ?? 0)
      document.getElementById('perm-input').value = student.permLevel ?? 0
      U.openModal('modal-perm')
    }
    document.getElementById('btn-email').onclick = sendEmailReminder
    document.getElementById('sel-date').onchange = function () {
      selectedDate = document.getElementById('sel-date').value
      loadItems()
    }
    document.getElementById('day-prev').onclick = function () {
      shiftDay(-1)
    }
    document.getElementById('day-next').onclick = function () {
      shiftDay(1)
    }
    document.getElementById('day-today').onclick = function () {
      selectedDate = U.todayISO()
      document.getElementById('sel-date').value = selectedDate
      loadItems()
    }
    document.getElementById('btn-add').onclick = addItem
    document.getElementById('perm-save').onclick = savePerm
    document.querySelector('[data-close]').onclick = function () {
      U.closeModal('modal-perm')
    }
  }

  function shiftDay(d) {
    var dt = new Date(selectedDate)
    dt.setDate(dt.getDate() + d)
    selectedDate = U.isoDate(dt)
    document.getElementById('sel-date').value = selectedDate
    loadItems()
  }

  function loadStudent() {
    return window.AdminApi.request('/admin/users/' + userId).then(function (data) {
      student = data
      render()
    })
  }

  function loadStats() {
    return window.AdminApi.request('/admin/users/' + userId + '/stats').then(function (s) {
      var el = document.getElementById('stats-row')
      if (!el || !s) return
      el.innerHTML =
        '<div class="stat-card">计划任务 ' +
        (s.planItemCount || 0) +
        ' 项</div>' +
        '<div class="stat-card">累计学习 ' +
        (s.totalMinutes || 0) +
        ' 分钟</div>' +
        '<div class="stat-card">上报 ' +
        (s.reportCount || 0) +
        ' 次</div>' +
        '<div class="stat-card">打卡 ' +
        (s.streakDays || 0) +
        ' 天</div>'
    })
  }

  function loadItems() {
    document.getElementById('items-title').textContent = selectedDate + ' 的任务'
    var tbody = document.getElementById('items-tbody')
    tbody.innerHTML = '<tr><td colspan="5">加载中…</td></tr>'
    return window.AdminApi.request(
      '/admin/plan-items?userId=' + userId + '&from=' + selectedDate + '&to=' + selectedDate
    ).then(function (data) {
      var items = data.list || []
      document.getElementById('items-title').textContent =
        selectedDate + ' 的任务（' + items.length + '）'
      if (!items.length) {
        tbody.innerHTML = '<tr><td colspan="5">当日暂无任务，可在下方添加</td></tr>'
        return
      }
      tbody.innerHTML = items
        .map(function (item) {
          return (
            '<tr><td>' +
            U.esc(item.subject) +
            '</td><td>' +
            U.esc(item.content) +
            '</td><td>' +
            item.targetMinutes +
            '</td><td>' +
            (item.reported
              ? '<span class="tag tag-ok">已报 ' + item.actualMinutes + '分</span>'
              : '<span class="tag tag-warn">未报</span>') +
            '</td><td><button type="button" class="btn btn-danger btn-sm" data-del="' +
            item.id +
            '">删除</button></td></tr>'
          )
        })
        .join('')
      tbody.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = function () {
          if (!confirm('确定删除该任务？')) return
          window.AdminApi.request('/admin/plan-items/' + btn.getAttribute('data-del'), {
            method: 'DELETE'
          })
            .then(function () {
              loadItems()
              loadStats()
            })
            .catch(function (e) {
              alert(e.message)
            })
        }
      })
    })
  }

  function addItem() {
    var subject = document.getElementById('f-subject').value.trim()
    var content = document.getElementById('f-content').value.trim()
    if (!subject || !content) {
      alert('请填写科目和任务内容')
      return
    }
    var btn = document.getElementById('btn-add')
    btn.disabled = true
    window.AdminApi.request('/admin/plan-items', {
      method: 'POST',
      body: JSON.stringify({
        userId: userId,
        date: selectedDate,
        subject: subject,
        content: content,
        targetMinutes: Number(document.getElementById('f-minutes').value) || 0
      })
    })
      .then(function () {
        document.getElementById('f-subject').value = ''
        document.getElementById('f-content').value = ''
        loadItems()
        loadStats()
      })
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        btn.disabled = false
      })
  }

  function savePerm() {
    window.AdminApi.request('/admin/users/' + userId + '/perm-level', {
      method: 'PATCH',
      body: JSON.stringify({ permLevel: Number(document.getElementById('perm-input').value) })
    })
      .then(function () {
        U.closeModal('modal-perm')
        loadStudent()
      })
      .catch(function (e) {
        alert(e.message)
      })
  }

  function sendEmailReminder() {
    if (!student.email || emailSending) return
    var today = U.todayISO()
    window.AdminApi.request('/admin/plan-items?userId=' + userId + '&from=' + today + '&to=' + today)
      .then(function (data) {
        var preview = (data.list || []).filter(function (t) {
          return !t.reported
        })
        if (!preview.length) {
          alert('今日无未完成任务，无需发送提醒')
          return
        }
        var lines = preview
          .map(function (t, i) {
            return i + 1 + '. 【' + t.subject + '】' + t.content
          })
          .join('\n')
        if (
          !confirm(
            '将向 ' + student.email + ' 发送邮件，包含 ' + preview.length + ' 项未完成任务：\n\n' + lines + '\n\n确定？'
          )
        )
          return
        emailSending = true
        return window.AdminApi.request('/admin/users/' + userId + '/email-reminder', { method: 'POST' })
      })
      .then(function (r) {
        if (r !== undefined) alert('已发送提醒邮件')
      })
      .catch(function (e) {
        alert(e.message)
      })
      .finally(function () {
        emailSending = false
      })
  }

  loadStudent().catch(function (e) {
    alert(e.message)
    location.href = 'users.html'
  })
})()
