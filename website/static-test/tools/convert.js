(function () {
  var enc = new TextEncoder()
  var dec = new TextDecoder('utf-8', { fatal: true })

  function getInputType() {
    return document.querySelector('input[name="input-type"]:checked').value
  }

  function getOutputType() {
    return document.querySelector('input[name="output-type"]:checked').value
  }

  function showStatus(el, type, msg) {
    el.hidden = false
    el.className = 'tool-status tool-status--' + type
    el.textContent = msg
  }

  function normalizeHex(raw) {
    return String(raw).replace(/[^0-9a-fA-F]/g, '')
  }

  function hexToBytes(hex) {
    var clean = normalizeHex(hex)
    if (!clean.length) return new Uint8Array(0)
    if (clean.length % 2 !== 0) {
      throw new Error('HEX 长度必须为偶数（当前 ' + clean.length + ' 个十六进制字符）')
    }
    var out = new Uint8Array(clean.length / 2)
    for (var i = 0; i < out.length; i++) {
      var byte = parseInt(clean.substr(i * 2, 2), 16)
      if (Number.isNaN(byte)) throw new Error('非法 HEX 在位置 ' + (i * 2))
      out[i] = byte
    }
    return out
  }

  function bytesToHex(bytes, upper, spaced) {
    var parts = []
    for (var i = 0; i < bytes.length; i++) {
      var h = bytes[i].toString(16)
      if (h.length < 2) h = '0' + h
      parts.push(upper ? h.toUpperCase() : h.toLowerCase())
    }
    return spaced ? parts.join(' ') : parts.join('')
  }

  function stringToBytes(str) {
    return enc.encode(str)
  }

  function bytesToString(bytes) {
    return dec.decode(bytes)
  }

  function autoSetOutputType() {
    var inp = getInputType()
    document.querySelector('input[name="output-type"][value="' + (inp === 'string' ? 'hex' : 'string') + '"]').checked = true
  }

  document.querySelectorAll('input[name="input-type"]').forEach(function (r) {
    r.addEventListener('change', autoSetOutputType)
  })

  document.getElementById('btn-convert').addEventListener('click', function () {
    var raw = document.getElementById('conv-input').value
    var status = document.getElementById('conv-status')
    var outEl = document.getElementById('conv-output')
    var upper = document.getElementById('hex-upper').checked
    var spaced = document.getElementById('hex-space').checked
    var inpType = getInputType()
    var outType = getOutputType()

    try {
      var bytes
      if (inpType === 'string') {
        bytes = stringToBytes(raw)
      } else {
        if (!normalizeHex(raw)) throw new Error('请输入 HEX 内容')
        bytes = hexToBytes(raw)
      }

      var result
      if (outType === 'hex') {
        result = bytesToHex(bytes, upper, spaced)
      } else {
        result = bytesToString(bytes)
      }

      outEl.textContent = result
      showStatus(status, 'ok', '转换完成（' + bytes.length + ' 字节）')
    } catch (e) {
      outEl.textContent = ''
      showStatus(status, 'err', e.message)
    }
  })

  document.getElementById('btn-length').addEventListener('click', function () {
    var raw = document.getElementById('conv-input').value
    var status = document.getElementById('conv-status')
    var lenBox = document.getElementById('length-result')
    var inpType = getInputType()

    try {
      var lines = []
      if (inpType === 'string') {
        var bytes = stringToBytes(raw)
        lines.push('字符数（Unicode 码点）：' + [...raw].length)
        lines.push('UTF-8 字节数：' + bytes.length)
        if (raw.length !== [...raw].length) {
          lines.push('（含 surrogate pair 等，与 code unit 长度 ' + raw.length + ' 可能不同）')
        }
      } else {
        var clean = normalizeHex(raw)
        var byteLen = clean.length / 2
        if (clean.length % 2 !== 0) {
          lines.push('HEX 字符数：' + clean.length + '（奇数，不完整字节 + 半字节）')
          lines.push('完整字节数：' + Math.floor(byteLen))
        } else {
          lines.push('HEX 字符数：' + clean.length)
          lines.push('字节数：' + byteLen)
        }
        if (clean.length) {
          try {
            var decoded = bytesToString(hexToBytes(raw))
            lines.push('按 UTF-8 解码预览：' + (decoded.length > 80 ? decoded.slice(0, 80) + '…' : decoded))
          } catch (e) {
            lines.push('UTF-8 解码预览：无法解码（' + e.message + '）')
          }
        }
      }

      lenBox.textContent = lines.join('\n')
      lenBox.hidden = false
      showStatus(status, 'info', '长度统计完成')
    } catch (e) {
      lenBox.hidden = true
      showStatus(status, 'err', e.message)
    }
  })

  document.getElementById('btn-swap').addEventListener('click', function () {
    var inp = document.getElementById('conv-input')
    var out = document.getElementById('conv-output')
    var outText = out.textContent
    if (!outText || outText.indexOf('（转换结果') === 0) return

    inp.value = outText
    var inpType = getInputType()
    document.querySelector('input[name="input-type"][value="' + (inpType === 'string' ? 'hex' : 'string') + '"]').checked = true
    autoSetOutputType()
  })

  document.getElementById('btn-conv-clear').addEventListener('click', function () {
    document.getElementById('conv-input').value = ''
    document.getElementById('conv-output').textContent = '（转换结果将显示在这里）'
    document.getElementById('conv-status').hidden = true
    document.getElementById('length-result').hidden = true
  })

  autoSetOutputType()
})()
