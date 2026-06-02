const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../db')
const { ok, fail } = require('../utils/response')
const { sign } = require('../utils/jwt')
const { authRequired, studentRequired, finalAdminRequired } = require('../middleware/auth')
const authService = require('../services/authService')
const permissionService = require('../services/permissionService')

const router = express.Router()

router.post('/wx-login', async (req, res) => {
  try {
    const data = await authService.wxLogin(req.body?.code)
    return ok(res, data)
  } catch (e) {
    if (e.code === 30001) {
      return fail(res, 30001, e.message, 200)
    }
    if (e.code && e.code < 50000) {
      return fail(res, e.code, e.message)
    }
    console.error('wx-login', e)
    return fail(res, 50000, e.message || '登录失败', 500)
  }
})

router.post('/wx-register', async (req, res) => {
  try {
    const data = await authService.wxRegister(req.body || {})
    return ok(res, data, '注册成功')
  } catch (e) {
    if (e.code === 30001) {
      return fail(res, 30001, e.message, 200)
    }
    if (e.code && e.code >= 10001 && e.code < 50000) {
      return fail(res, e.code, e.message)
    }
    console.error('wx-register', e)
    return fail(res, 50000, e.message || '注册失败', 500)
  }
})

router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) return fail(res, 10001, '请输入账号密码')

  const user = await db.get('SELECT * FROM users WHERE username = ? AND role = ?', [username, 'admin'])
  if (!user || !user.password_hash) return fail(res, 20001, '账号或密码错误')
  if (!bcrypt.compareSync(password, user.password_hash)) return fail(res, 20001, '账号或密码错误')
  if (user.status !== 'active') return fail(res, 30002, '账号已禁用')

  const token = sign({ sub: user.id, role: user.role })
  return ok(res, { token, nickname: user.nickname })
})

router.get('/me', authRequired, (req, res) => {
  return ok(res, authService.mapUser(req.user))
})

router.patch('/me', authRequired, studentRequired, async (req, res) => {
  try {
    const profile = await authService.updateProfile(req.user.id, req.body || {})
    return ok(res, profile, '保存成功')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/email-settings', authRequired, studentRequired, async (req, res) => {
  try {
    const profile = await authService.updateEmailSettings(req.user.id, req.body || {})
    return ok(res, profile, '保存成功')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.post('/permission-requests', authRequired, studentRequired, async (req, res) => {
  try {
    const data = await permissionService.createRequest(req.user.id, req.body || {})
    return ok(res, data, '申请已提交，请等待审核')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.get('/permission-requests', authRequired, studentRequired, async (req, res) => {
  try {
    const list = await permissionService.listMyRequests(req.user.id)
    return ok(res, { list })
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/permission-requests/review-queue', authRequired, studentRequired, finalAdminRequired, async (req, res) => {
  try {
    const data = await permissionService.listPendingForFinalAdmin(req.user.id, {
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.patch('/permission-requests/:id/review', authRequired, studentRequired, finalAdminRequired, async (req, res) => {
  try {
    const data = await permissionService.reviewRequestAsFinalAdmin(
      req.user.id,
      Number(req.params.id),
      req.body || {}
    )
    const msg = data.approved ? `已通过，用户权限设为 L${data.permLevel}` : '已拒绝'
    return ok(res, data, msg)
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

module.exports = router
