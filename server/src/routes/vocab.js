const express = require('express')
const { ok, fail } = require('../utils/response')
const vocabService = require('../services/vocabService')

const router = express.Router()

/** 今日页预览单词（无需登录） */
router.get('/preview', async (req, res) => {
  try {
    const count = Math.min(Math.max(Number(req.query.count) || 3, 1), 10)
    const date = String(req.query.date || '').slice(0, 10) || undefined
    const data = await vocabService.getPreview(count, date)
    return ok(res, data)
  } catch (e) {
    return fail(res, 50000, e.message || '获取失败', 500)
  }
})

/** 学习页一组单词（无需登录） */
router.get('/set', async (req, res) => {
  try {
    const wordCount = Number(req.query.wordCount || req.query.words || 10)
    const withPhrase = req.query.phrase !== '0' && req.query.withPhrase !== '0'
    const data = await vocabService.getSet({ wordCount, withPhrase })
    return ok(res, data)
  } catch (e) {
    return fail(res, 50000, e.message || '获取失败', 500)
  }
})

router.get('/stats', async (req, res) => {
  try {
    return ok(res, await vocabService.getStats())
  } catch (e) {
    return fail(res, 50000, e.message || '获取失败', 500)
  }
})

module.exports = router
