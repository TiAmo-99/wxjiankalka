(function () {
  var U = window.AdminUtils
  var tab = 'words'
  var page = 1
  var phrasePage = 1
  var pageSize = 20
  var total = 0
  var phraseTotal = 0
  var wordEditId = null
  var phraseEditId = null

  function kindLabel(k) {
    if (k === 'sentence') return '长句'
    if (k === 'passage') return '阅读片段'
    return '短语'
  }

  function loadStats() {
    return window.AdminApi.request('/admin/vocab/stats').then(function (d) {
      d = d || {}
      document.getElementById('stats-row').innerHTML =
        '<div class="stat-card"><span class="stat-label">总单词</span><span class="stat-value">' +
        (d.totalWords || 0) +
        '</span></div>' +
        '<div class="stat-card ok"><span class="stat-label">启用</span><span class="stat-value">' +
        (d.activeWords || 0) +
        '</span></div>' +
        '<div class="stat-card"><span class="stat-label">短语</span><span class="stat-value">' +
        (d.phraseKindCount || 0) +
        '</span></div>' +
        '<div class="stat-card"><span class="stat-label">长句</span><span class="stat-value">' +
        (d.sentenceCount || 0) +
        '</span></div>' +
        '<div class="stat-card"><span class="stat-label">片段</span><span class="stat-value">' +
        (d.passageCount || 0) +
        '</span></div>'
    })
  }

  function loadWords() {
    var tbody = document.getElementById('w-tbody')
    tbody.innerHTML = '<tr><td colspan="7">加载中…</td></tr>'
    var q = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      keyword: document.getElementById('w-keyword').value,
      status: document.getElementById('w-status').value
    })
    return window.AdminApi.request('/admin/vocab/words?' + q).then(function (data) {
      var list = data.list || []
      total = data.total || 0
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7">暂无单词</td></tr>'
      } else {
        tbody.innerHTML = list
          .map(function (row) {
            return (
              '<tr><td>' +
              row.id +
              '</td><td style="font-weight:600">' +
              U.esc(row.word) +
              '</td><td>' +
              U.esc(row.phonetic || '—') +
              '</td><td class="content-cell">' +
              U.esc(row.meaningZh) +
              '</td><td>' +
              U.esc(row.tags) +
              '</td><td><span class="tag ' +
              (row.status === 1 ? 'tag-ok' : 'tag-off') +
              '">' +
              (row.status === 1 ? '启用' : '停用') +
              '</span></td><td class="actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-we="' +
              row.id +
              '">编辑</button> ' +
              '<button type="button" class="btn btn-ghost btn-sm" data-wt="' +
              row.id +
              '">切换</button> ' +
              '<button type="button" class="btn btn-danger btn-sm" data-wd="' +
              row.id +
              '">删</button></td></tr>'
            )
          })
          .join('')
        bindWordActions(list)
      }
      renderPager()
    })
  }

  function bindWordActions(list) {
    list.forEach(function (row) {
      document.querySelector('[data-we="' + row.id + '"]').onclick = function () {
        openWordEdit(row)
      }
      document.querySelector('[data-wt="' + row.id + '"]').onclick = function () {
        window.AdminApi.request('/admin/vocab/words/' + row.id, {
          method: 'PATCH',
          body: JSON.stringify({ status: row.status === 1 ? 0 : 1 })
        })
          .then(function () {
            loadWords()
            loadStats()
          })
          .catch(function (e) {
            alert(e.message)
          })
      }
      document.querySelector('[data-wd="' + row.id + '"]').onclick = function () {
        if (!confirm('删除「' + row.word + '」？')) return
        window.AdminApi.request('/admin/vocab/words/' + row.id, { method: 'DELETE' })
          .then(function () {
            loadWords()
            loadStats()
          })
          .catch(function (e) {
            alert(e.message)
          })
      }
    })
  }

  function loadPhrases() {
    var tbody = document.getElementById('p-tbody')
    tbody.innerHTML = '<tr><td colspan="7">加载中…</td></tr>'
    var q = new URLSearchParams({
      page: String(phrasePage),
      pageSize: String(pageSize),
      keyword: document.getElementById('p-keyword').value,
      status: document.getElementById('p-status').value,
      kind: document.getElementById('p-kind').value
    })
    return window.AdminApi.request('/admin/vocab/phrases?' + q).then(function (data) {
      var list = data.list || []
      phraseTotal = data.total || 0
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7">暂无语料</td></tr>'
      } else {
        tbody.innerHTML = list
          .map(function (row) {
            var clip = row.phraseEn.length > 60 ? row.phraseEn.slice(0, 60) + '…' : row.phraseEn
            return (
              '<tr><td>' +
              row.id +
              '</td><td>' +
              kindLabel(row.kind) +
              '</td><td>' +
              U.esc(row.title || '—') +
              '</td><td class="content-cell">' +
              U.esc(clip) +
              '</td><td class="content-cell">' +
              U.esc(row.meaningZh) +
              '</td><td><span class="tag ' +
              (row.status === 1 ? 'tag-ok' : 'tag-off') +
              '">' +
              (row.status === 1 ? '启用' : '停用') +
              '</span></td><td class="actions">' +
              '<button type="button" class="btn btn-ghost btn-sm" data-pe="' +
              row.id +
              '">编辑</button> ' +
              '<button type="button" class="btn btn-ghost btn-sm" data-pt="' +
              row.id +
              '">切换</button> ' +
              '<button type="button" class="btn btn-danger btn-sm" data-pd="' +
              row.id +
              '">删</button></td></tr>'
            )
          })
          .join('')
        bindPhraseActions(list)
      }
      renderPager()
    })
  }

  function bindPhraseActions(list) {
    list.forEach(function (row) {
      document.querySelector('[data-pe="' + row.id + '"]').onclick = function () {
        openPhraseEdit(row)
      }
      document.querySelector('[data-pt="' + row.id + '"]').onclick = function () {
        window.AdminApi.request('/admin/vocab/phrases/' + row.id, {
          method: 'PATCH',
          body: JSON.stringify({ status: row.status === 1 ? 0 : 1 })
        })
          .then(function () {
            loadPhrases()
            loadStats()
          })
          .catch(function (e) {
            alert(e.message)
          })
      }
      document.querySelector('[data-pd="' + row.id + '"]').onclick = function () {
        if (!confirm('确定删除该语料？')) return
        window.AdminApi.request('/admin/vocab/phrases/' + row.id, { method: 'DELETE' })
          .then(function () {
            loadPhrases()
            loadStats()
          })
          .catch(function (e) {
            alert(e.message)
          })
      }
    })
  }

  function renderPager() {
    var cur = tab === 'words' ? page : phrasePage
    var tot = tab === 'words' ? total : phraseTotal
    U.renderPager(document.getElementById('pager'), cur, pageSize, tot, function (p) {
      if (tab === 'words') {
        page = p
        loadWords()
      } else {
        phrasePage = p
        loadPhrases()
      }
    })
  }

  function switchTab(t) {
    tab = t
    document.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === t)
    })
    document.getElementById('panel-words').hidden = t !== 'words'
    document.getElementById('panel-phrases').hidden = t !== 'phrases'
    if (t === 'words') loadWords()
    else loadPhrases()
  }

  function openWordCreate() {
    wordEditId = null
    document.getElementById('word-modal-title').textContent = '新增单词'
    document.getElementById('wf-word').value = ''
    document.getElementById('wf-phonetic').value = ''
    document.getElementById('wf-meaning').value = ''
    document.getElementById('wf-ex-en').value = ''
    document.getElementById('wf-ex-zh').value = ''
    document.getElementById('wf-tags').value = 'kaoyan'
    document.getElementById('wf-status').value = '1'
    U.openModal('modal-word')
  }

  function openWordEdit(row) {
    wordEditId = row.id
    document.getElementById('word-modal-title').textContent = '编辑单词'
    document.getElementById('wf-word').value = row.word
    document.getElementById('wf-phonetic').value = row.phonetic || ''
    document.getElementById('wf-meaning').value = row.meaningZh
    document.getElementById('wf-ex-en').value = row.exampleEn || ''
    document.getElementById('wf-ex-zh').value = row.exampleZh || ''
    document.getElementById('wf-tags').value = row.tags || 'kaoyan'
    document.getElementById('wf-status').value = String(row.status)
    U.openModal('modal-word')
  }

  function openPhraseCreate() {
    phraseEditId = null
    document.getElementById('phrase-modal-title').textContent = '新增语料'
    document.getElementById('pf-kind').value = 'phrase'
    document.getElementById('pf-title').value = ''
    document.getElementById('pf-en').value = ''
    document.getElementById('pf-zh').value = ''
    document.getElementById('pf-tags').value = 'kaoyan'
    document.getElementById('pf-status').value = '1'
    U.openModal('modal-phrase')
  }

  function openPhraseEdit(row) {
    phraseEditId = row.id
    document.getElementById('phrase-modal-title').textContent = '编辑语料'
    document.getElementById('pf-kind').value = row.kind || 'phrase'
    document.getElementById('pf-title').value = row.title || ''
    document.getElementById('pf-en').value = row.phraseEn
    document.getElementById('pf-zh').value = row.meaningZh
    document.getElementById('pf-tags').value = row.tags || 'kaoyan'
    document.getElementById('pf-status').value = String(row.status)
    U.openModal('modal-phrase')
  }

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.onclick = function () {
      switchTab(btn.getAttribute('data-tab'))
    }
  })

  document.getElementById('w-search').onclick = function () {
    page = 1
    loadWords()
  }
  document.getElementById('p-search').onclick = function () {
    phrasePage = 1
    loadPhrases()
  }
  document.getElementById('w-create').onclick = openWordCreate
  document.getElementById('p-create').onclick = openPhraseCreate

  document.querySelectorAll('[data-close]').forEach(function (el) {
    el.onclick = function () {
      U.closeModal(el.getAttribute('data-close'))
    }
  })

  document.getElementById('word-save').onclick = function () {
    var word = document.getElementById('wf-word').value.trim()
    var meaning = document.getElementById('wf-meaning').value.trim()
    if (!word || !meaning) {
      alert('请填写单词和释义')
      return
    }
    var payload = {
      word: word,
      phonetic: document.getElementById('wf-phonetic').value.trim(),
      meaningZh: meaning,
      exampleEn: document.getElementById('wf-ex-en').value.trim(),
      exampleZh: document.getElementById('wf-ex-zh').value.trim(),
      tags: document.getElementById('wf-tags').value.trim() || 'kaoyan',
      status: Number(document.getElementById('wf-status').value)
    }
    var url = wordEditId ? '/admin/vocab/words/' + wordEditId : '/admin/vocab/words'
    var method = wordEditId ? 'PATCH' : 'POST'
    window.AdminApi.request(url, { method: method, body: JSON.stringify(payload) })
      .then(function () {
        U.closeModal('modal-word')
        loadWords()
        loadStats()
      })
      .catch(function (e) {
        alert(e.message)
      })
  }

  document.getElementById('phrase-save').onclick = function () {
    var en = document.getElementById('pf-en').value.trim()
    var zh = document.getElementById('pf-zh').value.trim()
    if (!en || !zh) {
      alert('请填写英文与中文')
      return
    }
    var payload = {
      kind: document.getElementById('pf-kind').value,
      title: document.getElementById('pf-title').value.trim(),
      phraseEn: en,
      meaningZh: zh,
      tags: document.getElementById('pf-tags').value.trim() || 'kaoyan',
      status: Number(document.getElementById('pf-status').value)
    }
    var url = phraseEditId ? '/admin/vocab/phrases/' + phraseEditId : '/admin/vocab/phrases'
    var method = phraseEditId ? 'PATCH' : 'POST'
    window.AdminApi.request(url, { method: method, body: JSON.stringify(payload) })
      .then(function () {
        U.closeModal('modal-phrase')
        loadPhrases()
        loadStats()
      })
      .catch(function (e) {
        alert(e.message)
      })
  }

  loadStats().then(function () {
    loadWords()
  })
})()
