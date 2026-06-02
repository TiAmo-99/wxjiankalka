const express = require('express')
const authRoutes = require('./auth')
const plansRoutes = require('./plans')
const reportsRoutes = require('./reports')
const statsRoutes = require('./stats')
const adminRoutes = require('./admin')
const encouragementsRoutes = require('./encouragements')
const vocabRoutes = require('./vocab')
const memosRoutes = require('./memos')
const { authRequired } = require('../middleware/auth')
const authService = require('../services/authService')
const { ok } = require('../utils/response')

const router = express.Router()

router.get('/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { status: 'up', time: new Date().toISOString() } })
})

router.use('/auth', authRoutes)

/** 兼容旧版小程序请求 /me */
router.get('/me', authRequired, (req, res) => {
  return ok(res, authService.mapUser(req.user))
})

router.use('/encouragements', encouragementsRoutes)
router.use('/vocab', vocabRoutes)
router.use('/plans', plansRoutes)
router.use('/reports', reportsRoutes)
router.use('/stats', statsRoutes)
router.use('/memos', memosRoutes)
router.use('/admin', adminRoutes)

module.exports = router
