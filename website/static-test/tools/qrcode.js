(function () {
  if (typeof QRCode === 'undefined') {
    alert('二维码库加载失败，请检查网络后刷新页面')
    return
  }

  var singleCanvas = document.getElementById('qr-canvas')
  var batchCanvases = []

  function showStatus(el, type, msg) {
    el.hidden = false
    el.className = 'tool-status tool-status--' + type
    el.textContent = msg
  }

  function hideStatus(el) {
    el.hidden = true
  }

  function qrOptions(size, ecc) {
    return {
      errorCorrectionLevel: ecc || 'M',
      width: size || 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' }
    }
  }

  function downloadCanvas(canvas, filename) {
    var link = document.createElement('a')
    link.download = filename
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function safeFilename(text, index) {
    var base = String(text)
      .slice(0, 24)
      .replace(/[^\w\u4e00-\u9fa5-]+/g, '_')
    return 'qr_' + (index != null ? index + 1 + '_' : '') + (base || 'code') + '.png'
  }

  document.querySelectorAll('.tool-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var mode = tab.getAttribute('data-mode')
      document.querySelectorAll('.tool-tab').forEach(function (t) {
        t.classList.toggle('is-active', t === tab)
      })
      document.getElementById('panel-single').hidden = mode !== 'single'
      document.getElementById('panel-batch').hidden = mode !== 'batch'
    })
  })

  document.getElementById('btn-qr-gen').addEventListener('click', function () {
    var text = document.getElementById('qr-text').value.trim()
    var status = document.getElementById('qr-status')
    var preview = document.getElementById('qr-single-preview')
    var dlBtn = document.getElementById('btn-qr-download')

    if (!text) {
      showStatus(status, 'err', '请输入要编码的内容')
      preview.hidden = true
      dlBtn.disabled = true
      return
    }

    var size = Math.min(512, Math.max(128, Number(document.getElementById('qr-size').value) || 280))
    var ecc = document.getElementById('qr-ecc').value

    QRCode.toCanvas(singleCanvas, text, qrOptions(size, ecc), function (err) {
      if (err) {
        showStatus(status, 'err', '生成失败：' + (err.message || String(err)))
        preview.hidden = true
        dlBtn.disabled = true
        return
      }
      hideStatus(status)
      preview.hidden = false
      dlBtn.disabled = false
      singleCanvas.dataset.text = text
    })
  })

  document.getElementById('btn-qr-download').addEventListener('click', function () {
    if (singleCanvas.dataset.text) {
      downloadCanvas(singleCanvas, safeFilename(singleCanvas.dataset.text))
    }
  })

  document.getElementById('btn-qr-clear').addEventListener('click', function () {
    document.getElementById('qr-text').value = ''
    document.getElementById('qr-single-preview').hidden = true
    document.getElementById('btn-qr-download').disabled = true
    hideStatus(document.getElementById('qr-status'))
    var ctx = singleCanvas.getContext('2d')
    ctx.clearRect(0, 0, singleCanvas.width, singleCanvas.height)
  })

  document.getElementById('btn-qr-batch').addEventListener('click', function () {
    var raw = document.getElementById('qr-batch-text').value
    var lines = raw
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim()
      })
      .filter(Boolean)
    var status = document.getElementById('qr-batch-status')
    var grid = document.getElementById('qr-batch-grid')
    var dlAll = document.getElementById('btn-qr-batch-dl')

    grid.innerHTML = ''
    batchCanvases = []

    if (!lines.length) {
      showStatus(status, 'err', '请至少输入一行内容')
      dlAll.disabled = true
      return
    }
    if (lines.length > 30) {
      showStatus(status, 'err', '批量最多 30 条，当前 ' + lines.length + ' 条')
      dlAll.disabled = true
      return
    }

    showStatus(status, 'info', '正在生成 ' + lines.length + ' 个二维码…')
    dlAll.disabled = true

    var size = 160
    var pending = lines.length
    var failed = 0

    lines.forEach(function (line, i) {
      var item = document.createElement('div')
      item.className = 'qr-batch-item'
      var canvas = document.createElement('canvas')
      var label = document.createElement('div')
      label.className = 'qr-batch-label'
      label.textContent = line
      label.title = line
      var btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'tool-btn tool-btn--ghost'
      btn.textContent = '下载'
      item.appendChild(canvas)
      item.appendChild(label)
      item.appendChild(btn)
      grid.appendChild(item)

      QRCode.toCanvas(canvas, line, qrOptions(size, 'M'), function (err) {
        pending--
        if (err) {
          failed++
          label.textContent = '失败: ' + line.slice(0, 20)
          btn.disabled = true
        } else {
          batchCanvases.push({ canvas: canvas, text: line, index: i })
          btn.addEventListener('click', function () {
            downloadCanvas(canvas, safeFilename(line, i))
          })
        }
        if (pending === 0) {
          if (failed) {
            showStatus(status, 'err', '完成，其中 ' + failed + ' 条生成失败')
          } else {
            showStatus(status, 'ok', '已生成 ' + batchCanvases.length + ' 个二维码')
          }
          dlAll.disabled = batchCanvases.length === 0
        }
      })
    })
  })

  document.getElementById('btn-qr-batch-dl').addEventListener('click', function () {
    batchCanvases.forEach(function (item, idx) {
      setTimeout(function () {
        downloadCanvas(item.canvas, safeFilename(item.text, item.index))
      }, idx * 300)
    })
  })

  document.getElementById('btn-qr-batch-clear').addEventListener('click', function () {
    document.getElementById('qr-batch-text').value = ''
    document.getElementById('qr-batch-grid').innerHTML = ''
    document.getElementById('btn-qr-batch-dl').disabled = true
    batchCanvases = []
    hideStatus(document.getElementById('qr-batch-status'))
  })
})()
