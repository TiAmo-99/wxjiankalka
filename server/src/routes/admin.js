const express = require('express')
const multer = require('multer')
const { ok, fail } = require('../utils/response')
const { authRequired, adminRequired } = require('../middleware/auth')
const adminService = require('../services/adminService')
const planItemImport = require('../services/planItemImport')
const adminReportService = require('../services/adminReportService')
const encouragementService = require('../services/encouragementService')
const emailReminderService = require('../services/emailReminderService')
const permissionService = require('../services/permissionService')
const adminVocabService = require('../services/adminVocabService')
const adminMemoService = require('../services/adminMemoService')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
})

const router = express.Router()
router.use(authRequired, adminRequired)

router.get('/users', async (req, res) => {
  try {
    const data = await adminService.listStudents({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      keyword: req.query.keyword || '',
      status: req.query.status || ''
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/users/:id', async (req, res) => {
  try {
    return ok(res, await adminService.getStudent(Number(req.params.id)))
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.patch('/users/:id', async (req, res) => {
  try {
    const data = await adminService.updateStudent(Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.get('/users/:id/stats', async (req, res) => {
  try {
    return ok(res, await adminService.getUserStats(Number(req.params.id)))
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.post('/users/:id/email-reminder', async (req, res) => {
  try {
    const data = await emailReminderService.sendManualReminder(Number(req.params.id))
    return ok(res, data, `已向 ${data.email} 发送提醒（${data.pendingCount} 项未完成任务）`)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.patch('/users/:id/perm-level', async (req, res) => {
  try {
    const permLevel = req.body?.permLevel ?? req.body?.perm_level
    if (permLevel === undefined) return fail(res, 10001, '缺少 permLevel')
    const data = await permissionService.updateUserPermLevel(Number(req.params.id), permLevel)
    return ok(res, data, `权限已更新为 ${data.permLevel}`)
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.get('/permission-requests', async (req, res) => {
  try {
    const data = await permissionService.listForAdmin({
      status: req.query.status || '',
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.patch('/permission-requests/:id', async (req, res) => {
  try {
    const data = await permissionService.reviewRequest(req.user.id, Number(req.params.id), req.body || {})
    const msg = data.approved ? `已通过，用户权限设为 ${data.permLevel}` : '已拒绝'
    return ok(res, data, msg)
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.get('/plans', async (req, res) => {
  try {
    const userId = Number(req.query.userId || req.query.user_id)
    if (!userId) return fail(res, 10001, '缺少 userId')
    return ok(res, { list: await adminService.listPlans(userId) })
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.post('/plans', async (req, res) => {
  try {
    const data = await adminService.createPlan(req.user.id, req.body || {})
    return ok(res, data, '计划已创建')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.get('/plan-items', async (req, res) => {
  try {
    const userId = Number(req.query.userId || req.query.user_id)
    const list = await adminService.listPlanItems({
      userId,
      planId: req.query.planId ? Number(req.query.planId) : undefined,
      from: req.query.from || req.query.date,
      to: req.query.to || req.query.date
    })
    return ok(res, { list })
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.get('/reports', async (req, res) => {
  try {
    const data = await adminReportService.listReports({
      from: req.query.from || req.query.startDate || '',
      to: req.query.to || req.query.endDate || '',
      keyword: req.query.keyword || '',
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/reports/export', async (req, res) => {
  try {
    const reports = await adminReportService.exportReports({
      from: req.query.from || '',
      to: req.query.to || '',
      keyword: req.query.keyword || ''
    })
    const buf = adminReportService.buildExportBuffer(reports)
    const from = req.query.from || 'all'
    const to = req.query.to || 'all'
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''%E5%AD%A6%E4%B9%A0%E4%B8%8A%E6%8A%A5_${from}_${to}.xlsx`
    )
    return res.send(buf)
  } catch (e) {
    return fail(res, 50000, e.message || '导出失败', 500)
  }
})

router.get('/plan-items/import-template', async (req, res) => {
  try {
    const userId = Number(req.query.userId || req.query.user_id)
    let studentNickname = ''
    if (userId) {
      const student = await adminService.getStudent(userId)
      studentNickname = student.realName
        ? `${student.nickname}（${student.realName}）`
        : student.nickname
    }
    const buf = planItemImport.buildImportTemplateBuffer({ studentNickname })
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    res.setHeader(
      'Content-Disposition',
      'attachment; filename*=UTF-8\'\'%E5%AD%A6%E4%B9%A0%E4%BB%BB%E5%8A%A1%E5%AF%BC%E5%85%A5%E6%A8%A1%E6%9D%BF.xlsx'
    )
    return res.send(buf)
  } catch (e) {
    return fail(res, 50000, e.message || '生成模板失败', 500)
  }
})

router.post('/plan-items/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return fail(res, 10001, '请上传 Excel 文件（.xlsx）')
    }
    const name = (req.file.originalname || '').toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      return fail(res, 10001, '仅支持 .xlsx / .xls 格式')
    }
    const userId = Number(req.body.userId || req.body.user_id)
    if (!userId) return fail(res, 10001, '请先选择学员')
    const data = await planItemImport.importPlanItemsFromBuffer(
      req.user.id,
      req.file.buffer,
      userId
    )
    const msg = `导入完成：成功 ${data.success} 条，失败 ${data.failed} 条`
    return ok(res, data, msg)
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.post('/plan-items', async (req, res) => {
  try {
    const data = await adminService.createPlanItem(req.user.id, req.body || {})
    return ok(res, data, '任务已添加')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/plan-items/:id', async (req, res) => {
  try {
    const data = await adminService.updatePlanItem(Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.delete('/plan-items/:id', async (req, res) => {
  try {
    await adminService.deletePlanItem(Number(req.params.id))
    return ok(res, { ok: true }, '已删除')
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.get('/encouragements', async (req, res) => {
  try {
    return ok(res, {
      list: await encouragementService.listAll({ status: req.query.status || '' })
    })
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.post('/encouragements', async (req, res) => {
  try {
    const data = await encouragementService.create(req.body || {})
    return ok(res, data, '已添加')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/encouragements/:id', async (req, res) => {
  try {
    const data = await encouragementService.update(Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.delete('/encouragements/:id', async (req, res) => {
  try {
    await encouragementService.remove(Number(req.params.id))
    return ok(res, { ok: true }, '已删除')
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.get('/vocab/stats', async (req, res) => {
  try {
    return ok(res, await adminVocabService.getAdminStats())
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/vocab/words', async (req, res) => {
  try {
    const data = await adminVocabService.listWords({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      keyword: req.query.keyword || '',
      status: req.query.status ?? '',
      tag: req.query.tag || ''
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/vocab/words/:id', async (req, res) => {
  try {
    return ok(res, await adminVocabService.getWord(Number(req.params.id)))
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.post('/vocab/words', async (req, res) => {
  try {
    const data = await adminVocabService.createWord(req.body || {})
    return ok(res, data, '单词已添加')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/vocab/words/:id', async (req, res) => {
  try {
    const data = await adminVocabService.updateWord(Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.delete('/vocab/words/:id', async (req, res) => {
  try {
    await adminVocabService.removeWord(Number(req.params.id))
    return ok(res, { ok: true }, '已删除')
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.get('/vocab/phrases', async (req, res) => {
  try {
    const data = await adminVocabService.listPhrases({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      keyword: req.query.keyword || '',
      status: req.query.status ?? '',
      kind: req.query.kind || ''
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/vocab/phrases/:id', async (req, res) => {
  try {
    return ok(res, await adminVocabService.getPhrase(Number(req.params.id)))
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.post('/vocab/phrases', async (req, res) => {
  try {
    const data = await adminVocabService.createPhrase(req.body || {})
    return ok(res, data, '语料已添加')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/vocab/phrases/:id', async (req, res) => {
  try {
    const data = await adminVocabService.updatePhrase(Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.delete('/vocab/phrases/:id', async (req, res) => {
  try {
    await adminVocabService.removePhrase(Number(req.params.id))
    return ok(res, { ok: true }, '已删除')
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.get('/memos/stats', async (req, res) => {
  try {
    return ok(res, await adminMemoService.getStats())
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/memos', async (req, res) => {
  try {
    const data = await adminMemoService.listAllMemos({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
      keyword: req.query.keyword || '',
      userId: req.query.userId || req.query.user_id || ''
    })
    return ok(res, data)
  } catch (e) {
    return fail(res, e.code || 50000, e.message)
  }
})

router.get('/memos/:id', async (req, res) => {
  try {
    return ok(res, await adminMemoService.getMemoById(Number(req.params.id)))
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

router.post('/memos', async (req, res) => {
  try {
    const data = await adminMemoService.createMemoForUser(req.body || {})
    return ok(res, data, '已创建')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.patch('/memos/:id', async (req, res) => {
  try {
    const data = await adminMemoService.updateMemoById(Number(req.params.id), req.body || {})
    return ok(res, data, '已保存')
  } catch (e) {
    return fail(res, e.code || 10001, e.message)
  }
})

router.delete('/memos/:id', async (req, res) => {
  try {
    await adminMemoService.removeMemoById(Number(req.params.id))
    return ok(res, { ok: true }, '已删除')
  } catch (e) {
    return fail(res, e.code || 30004, e.message)
  }
})

module.exports = router
