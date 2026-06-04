(function () {
  var now = new Date()
  var pad = function (n) {
    return n < 10 ? '0' + n : String(n)
  }
  var timeStr =
    now.getFullYear() +
    '-' +
    pad(now.getMonth() + 1) +
    '-' +
    pad(now.getDate()) +
    ' ' +
    pad(now.getHours()) +
    ':' +
    pad(now.getMinutes()) +
    ':' +
    pad(now.getSeconds())

  var elTime = document.getElementById('visitTime')
  var elUrl = document.getElementById('visitUrl')
  var elProto = document.getElementById('visitProto')

  if (elTime) elTime.textContent = timeStr
  if (elUrl) elUrl.textContent = window.location.href
  if (elProto) elProto.textContent = window.location.protocol.replace(':', '').toUpperCase()
})()
