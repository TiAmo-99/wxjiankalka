const express = require('express')
const memoService = require('../services/memoService')
const { ok, fail } = require('../utils/response')
const { authRequired, studentRequired } = require('../middleware/auth')

const router = express.Router()
router.use(authRequired, studentRequired)

router.get('/', async (req, res) => {
  try {
    const data = await memoService.listMemos(req.user.id, {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 50,
      keyword: req.query.keyword || ''
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/:id', async (req, res) => {
  try {
    return ok(res, await memoService.getMemo(req.user.id, Number(req.params.id)))
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.post('/', async (req, res) => {
  try {
    const data = await memoService.createMemo(req.user.id, req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const data = await memoService.updateMemo(req.user.id, Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await memoService.removeMemo(req.user.id, Number(req.params.id))
    return ok(res, { ok: true }, '已删除')
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

module.exports = router
