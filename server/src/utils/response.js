function ok(res, data = null, message = 'ok') {
  return res.json({ code: 0, message, data })
}

function fail(res, code, message, httpStatus = 200) {
  return res.status(httpStatus).json({ code, message, data: null })
}

module.exports = { ok, fail }
