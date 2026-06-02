const express = require('express')
const { ok, fail } = require('../utils/response')
const encouragementService = require('../services/encouragementService')

const router = express.Router()

/** 小程序首页随机鼓励语（无需登录） */
router.get('/random', async (req, res) => {
  try {
    return ok(res, await encouragementService.getRandom())
  } catch (e) {
    return fail(res, 50000, e.message || '获取失败', 500)
  }
})

module.exports = router
