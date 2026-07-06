const express = require('express')
const { ok, fail } = require('../utils/response')
const { authRequired, studentRequired } = require('../middleware/auth')
const permissionService = require('../services/permissionService')
const qrcodeService = require('../services/qrcodeService')

const router = express.Router()

/** 生成二维码 PNG（L1+，返回 base64） */
router.post('/qrcode', authRequired, studentRequired, async (req, res) => {
  if (!permissionService.canUseQrcode(req.user.perm_level)) {
    return fail(res, 20003, '需要 L1 及以上权限', 403)
  }

  try {
    const { text, size } = req.body || {}
    const data = await qrcodeService.generatePng(text, size)
    return ok(res, data, 'ok')
  } catch (e) {
    if (e.code && e.code >= 10001 && e.code < 50000) {
      return fail(res, e.code, e.message)
    }
    console.error('tools/qrcode', e)
    return fail(res, 50000, e.message || '生成失败', 500)
  }
})

module.exports = router
