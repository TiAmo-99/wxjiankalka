const express = require('express')
const reportService = require('../services/reportService')
const { ok } = require('../utils/response')
const { authRequired, studentRequired } = require('../middleware/auth')

const router = express.Router()
router.use(authRequired, studentRequired)

router.get('/summary', async (req, res) => {
  const data = await reportService.getSummary(req.user.id)
  return ok(res, data)
})

module.exports = router
