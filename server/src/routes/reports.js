const express = require('express')
const reportService = require('../services/reportService')
const { ok, fail } = require('../utils/response')
const { authRequired, studentRequired } = require('../middleware/auth')

const router = express.Router()
router.use(authRequired, studentRequired)

router.post('/', async (req, res) => {
  try {
    const data = await reportService.upsertReport(req.user.id, req.body || {})
    return ok(res, data, '记录成功')
  } catch (e) {
    const code = e.code || 30000
    const status = e.statusCode || 200
    return fail(res, code, e.message, status)
  }
})

router.get('/today', async (req, res) => {
  const list = await reportService.listTodayReports(req.user.id)
  return ok(res, { list })
})

router.get('/', async (req, res) => {
  const { from, to, page, pageSize } = req.query || {}
  const data = await reportService.listReports(req.user.id, { from, to, page, pageSize })
  return ok(res, data)
})

module.exports = router
