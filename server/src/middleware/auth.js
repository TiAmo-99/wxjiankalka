const { verify } = require('../utils/jwt')
const { fail } = require('../utils/response')
const db = require('../db')
const permissionService = require('../services/permissionService')

function getBearerToken(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return null
}

function authRequired(req, res, next) {
  ;(async () => {
    try {
      const token = getBearerToken(req)
      if (!token) return fail(res, 20001, '未登录', 200)
      const payload = verify(token)
      const user = await db.get('SELECT * FROM users WHERE id = ?', [payload.sub])
      if (!user || user.status !== 'active') return fail(res, 20002, '账号不可用', 200)
      req.user = user
      next()
    } catch (e) {
      return fail(res, 20001, '登录已失效', 200)
    }
  })()
}

function studentRequired(req, res, next) {
  if (req.user.role !== 'student') return fail(res, 20003, '无权限', 403)
  next()
}

function adminRequired(req, res, next) {
  if (req.user.role !== 'admin') return fail(res, 20003, '无权限', 403)
  next()
}

function finalAdminRequired(req, res, next) {
  if (req.user.role !== 'student' || !permissionService.isFinalAdmin(req.user.perm_level)) {
    return fail(res, 20003, '需要 L10 最终管理员权限', 403)
  }
  next()
}

module.exports = { authRequired, studentRequired, adminRequired, finalAdminRequired }
