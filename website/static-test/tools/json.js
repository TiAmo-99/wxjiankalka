(function () {
  function showStatus(el, type, msg) {
    el.hidden = false
    el.className = 'tool-status tool-status--' + type
    el.textContent = msg
  }

  function parseJson(text) {
    return JSON.parse(text)
  }

  function jsonType(val) {
    if (val === null) return 'null'
    if (Array.isArray(val)) return 'array'
    return typeof val
  }

  function flattenJson(val, prefix) {
    var rows = []
    var t = jsonType(val)

    if (t !== 'object' && t !== 'array') {
      rows.push({
        key: prefix || '(root)',
        value: t === 'string' ? val : JSON.stringify(val),
        type: t
      })
      return rows
    }

    if (t === 'array') {
      if (!val.length) {
        rows.push({ key: prefix || '(root)', value: '[]', type: 'array' })
        return rows
      }
      val.forEach(function (item, i) {
        var path = prefix ? prefix + '[' + i + ']' : '[' + i + ']'
        rows = rows.concat(flattenJson(item, path))
      })
      return rows
    }

    var keys = Object.keys(val)
    if (!keys.length) {
      rows.push({ key: prefix || '(root)', value: '{}', type: 'object' })
      return rows
    }

    keys.forEach(function (k) {
      var path = prefix ? prefix + '.' + k : k
      var child = val[k]
      var ct = jsonType(child)
      if (ct === 'object' || ct === 'array') {
        rows = rows.concat(flattenJson(child, path))
      } else {
        rows.push({
          key: path,
          value: ct === 'string' ? child : JSON.stringify(child),
          type: ct
        })
      }
    })
    return rows
  }

  function setByPath(root, path, value) {
    var parts = []
    path.replace(/([^.\[\]]+)|\[(\d+)\]/g, function (_, key, idx) {
      if (key !== undefined) parts.push(key)
      if (idx !== undefined) parts.push(Number(idx))
    })
    if (!parts.length) return value

    var cur = root
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i]
      var n = parts[i + 1]
      if (typeof p === 'number') {
        if (!Array.isArray(cur)) throw new Error('路径 ' + path + ' 与当前结构不匹配')
        if (cur[p] == null) cur[p] = typeof n === 'number' ? [] : {}
        cur = cur[p]
      } else {
        if (cur[p] == null) cur[p] = typeof n === 'number' ? [] : {}
        else if (typeof cur[p] !== 'object') throw new Error('路径 ' + path + ' 冲突')
        cur = cur[p]
      }
    }

    var last = parts[parts.length - 1]
    if (typeof last === 'number') {
      if (!Array.isArray(cur)) throw new Error('路径 ' + path + ' 需要数组')
      cur[last] = value
    } else {
      cur[last] = value
    }
    return root
  }

  function coerceValue(raw, type) {
    var s = String(raw).trim()
    switch (type) {
      case 'number':
        if (s === '') return 0
        var n = Number(s)
        if (Number.isNaN(n)) throw new Error('无法转为数字: ' + s)
        return n
      case 'boolean':
        if (s === 'true' || s === '1') return true
        if (s === 'false' || s === '0') return false
        throw new Error('布尔值请填 true/false')
      case 'null':
        return null
      case 'object':
        return s ? parseJson(s) : {}
      case 'array':
        return s ? parseJson(s) : []
      default:
        return s
    }
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
    }
    var ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    return Promise.resolve()
  }

  document.querySelectorAll('.tool-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var panel = tab.getAttribute('data-panel')
      document.querySelectorAll('.tool-tab').forEach(function (t) {
        t.classList.toggle('is-active', t === tab)
      })
      document.querySelectorAll('.tool-panel').forEach(function (p) {
        p.hidden = p.id !== 'panel-' + panel
      })
    })
  })

  document.getElementById('btn-json-validate').addEventListener('click', function () {
    var text = document.getElementById('json-input').value.trim()
    var status = document.getElementById('json-fmt-status')
    var out = document.getElementById('json-fmt-output')
    out.hidden = true
    if (!text) {
      showStatus(status, 'err', '请输入 JSON 字符串')
      return
    }
    try {
      var data = parseJson(text)
      showStatus(status, 'ok', '合法 JSON（根类型：' + jsonType(data) + '）')
    } catch (e) {
      showStatus(status, 'err', '非法 JSON：' + e.message)
    }
  })

  document.getElementById('btn-json-format').addEventListener('click', function () {
    var text = document.getElementById('json-input').value.trim()
    var status = document.getElementById('json-fmt-status')
    var out = document.getElementById('json-fmt-output')
    if (!text) {
      showStatus(status, 'err', '请输入 JSON 字符串')
      out.hidden = true
      return
    }
    try {
      var formatted = JSON.stringify(parseJson(text), null, 2)
      document.getElementById('json-input').value = formatted
      out.textContent = formatted
      out.hidden = false
      showStatus(status, 'ok', '已格式化为 2 空格缩进')
    } catch (e) {
      out.hidden = true
      showStatus(status, 'err', '格式化失败：' + e.message)
    }
  })

  document.getElementById('btn-json-minify').addEventListener('click', function () {
    var text = document.getElementById('json-input').value.trim()
    var status = document.getElementById('json-fmt-status')
    try {
      var min = JSON.stringify(parseJson(text))
      document.getElementById('json-input').value = min
      showStatus(status, 'ok', '已压缩为一行')
    } catch (e) {
      showStatus(status, 'err', e.message)
    }
  })

  document.getElementById('btn-json-clear-fmt').addEventListener('click', function () {
    document.getElementById('json-input').value = ''
    document.getElementById('json-fmt-output').hidden = true
    document.getElementById('json-fmt-status').hidden = true
  })

  document.getElementById('btn-json-table').addEventListener('click', function () {
    var text = document.getElementById('json-table-input').value.trim()
    var status = document.getElementById('json-table-status')
    var wrap = document.getElementById('json-table-wrap')
    var body = document.getElementById('json-table-body')
    body.innerHTML = ''
    if (!text) {
      showStatus(status, 'err', '请输入 JSON')
      wrap.hidden = true
      return
    }
    try {
      var rows = flattenJson(parseJson(text), '')
      if (!rows.length) {
        showStatus(status, 'err', '无数据')
        wrap.hidden = true
        return
      }
      rows.forEach(function (row) {
        var tr = document.createElement('tr')
        tr.innerHTML =
          '<td>' +
          escapeHtml(row.key) +
          '</td><td>' +
          escapeHtml(String(row.value)) +
          '</td><td>' +
          escapeHtml(row.type) +
          '</td>'
        body.appendChild(tr)
      })
      wrap.hidden = false
      showStatus(status, 'ok', '共 ' + rows.length + ' 行（含嵌套路径）')
    } catch (e) {
      wrap.hidden = true
      showStatus(status, 'err', e.message)
    }
  })

  document.getElementById('btn-json-table-copy').addEventListener('click', function () {
    var text = document.getElementById('json-table-input').value
    if (!text.trim()) return
    copyText(text).then(function () {
      showStatus(document.getElementById('json-table-status'), 'ok', '已复制到剪贴板')
    })
  })

  function escapeHtml(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function addEditRow(key, value, type) {
    var body = document.getElementById('edit-table-body')
    var tr = document.createElement('tr')
    tr.innerHTML =
      '<td><input type="text" class="cell-key" value="' +
      escapeHtml(key || '') +
      '" placeholder="key 或 a.b[0]" /></td>' +
      '<td><input type="text" class="cell-val" value="' +
      escapeHtml(value || '') +
      '" /></td>' +
      '<td><select class="cell-type">' +
      ['string', 'number', 'boolean', 'null', 'object', 'array']
        .map(function (t) {
          return '<option value="' + t + '"' + (type === t ? ' selected' : '') + '>' + t + '</option>'
        })
        .join('') +
      '</select></td>' +
      '<td><button type="button" class="tool-btn tool-btn--ghost btn-row-del" style="padding:4px 8px;font-size:0.75rem">删</button></td>'
    tr.querySelector('.btn-row-del').addEventListener('click', function () {
      tr.remove()
    })
    body.appendChild(tr)
  }

  document.getElementById('btn-row-add').addEventListener('click', function () {
    addEditRow('', '', 'string')
  })

  document.getElementById('btn-table-json').addEventListener('click', function () {
    var status = document.getElementById('table-json-status')
    var out = document.getElementById('table-json-output')
    var rows = document.querySelectorAll('#edit-table-body tr')
    if (!rows.length) {
      showStatus(status, 'err', '请至少添加一行')
      out.hidden = true
      return
    }

    try {
      var root = {}
      var isArrayRoot = false
      rows.forEach(function (tr, idx) {
        var key = tr.querySelector('.cell-key').value.trim()
        var valRaw = tr.querySelector('.cell-val').value
        var type = tr.querySelector('.cell-type').value
        if (!key) throw new Error('第 ' + (idx + 1) + ' 行缺少键')

        if (key === '(root)' || key === 'root') {
          root = coerceValue(valRaw, type)
          isArrayRoot = jsonType(root) === 'array'
          return
        }

        if (isArrayRoot && jsonType(root) !== 'object') {
          throw new Error('根已为数组时不能再添加子键')
        }

        var val = coerceValue(valRaw, type)
        if (jsonType(root) === 'array') {
          throw new Error('请用表格第一行 (root) 定义数组，或使用 object 根')
        }
        setByPath(root, key, val)
      })

      var json = JSON.stringify(root, null, 2)
      out.textContent = json
      out.hidden = false
      showStatus(status, 'ok', '已生成 JSON')
    } catch (e) {
      out.hidden = true
      showStatus(status, 'err', e.message)
    }
  })

  document.getElementById('btn-table-copy').addEventListener('click', function () {
    var out = document.getElementById('table-json-output')
    if (out.hidden || !out.textContent) return
    copyText(out.textContent).then(function () {
      showStatus(document.getElementById('table-json-status'), 'ok', '已复制')
    })
  })

  addEditRow('name', '简卡拉卡', 'string')
  addEditRow('version', '1', 'number')
})()
