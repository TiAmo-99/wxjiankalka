const express = require('express')
const planService = require('../services/planService')
const { ok } = require('../utils/response')
const { authRequired, studentRequired } = require('../middleware/auth')

const router = express.Router()
router.use(authRequired, studentRequired)

router.get('/today', async (req, res) => {
  const list = await planService.listToday(req.user.id)
  return ok(res, { list })
})

router.get('/week', async (req, res) => {
  const list = await planService.listWeek(req.user.id)
  return ok(res, { list })
})

router.get('/all', async (req, res) => {
  const list = await planService.listAll(req.user.id)
  return ok(res, { list })
})

router.get('/day', async (req, res) => {
  const date = req.query.date
  if (!date) return ok(res, { list: [] })
  const list = await planService.listDay(req.user.id, date)
  return ok(res, { list })
})

router.post('/items', async (req, res) => {
  const item = await planService.createStudentPlanItem(req.user.id, req.body || {})
  return ok(res, { item })
})

module.exports = router
