const XLSX = require('xlsx')
const adminService = require('./adminService')

const HEADERS = {
  date: ['日期', '任务日期', 'date'],
  subject: ['科目', 'subject'],
  content: ['任务内容', '内容', 'content'],
  targetMinutes: ['目标分钟', '目标(分钟)', 'targetMinutes', 'target_minutes', '分钟']
}

const TEMPLATE_HEADERS = ['日期', '科目', '任务内容', '目标分钟']

function normalizeHeader(cell) {
  return String(cell ?? '')
    .trim()
    .replace(/\s/g, '')
}

function buildHeaderMap(row) {
  const map = {}
  row.forEach((cell, index) => {
    const text = normalizeHeader(cell)
    if (!text) return
    for (const [key, aliases] of Object.entries(HEADERS)) {
      if (aliases.some((a) => normalizeHeader(a) === text)) {
        map[key] = index
      }
    }
  })
  return map
}

function cellVal(row, index) {
  if (index === undefined || index < 0) return ''
  const v = row[index]
  if (v === null || v === undefined) return ''
  if (v instanceof Date) {
    const y = v.getFullYear()
    const m = `${v.getMonth() + 1}`.padStart(2, '0')
    const d = `${v.getDate()}`.padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v).trim()
}

function parseDate(val) {
  const s = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('/')
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const n = Number(val)
  if (!Number.isNaN(n) && n > 20000) {
    const parsed = XLSX.SSF.parse_date_code(n)
    if (parsed) {
      return `${parsed.y}-${`${parsed.m}`.padStart(2, '0')}-${`${parsed.d}`.padStart(2, '0')}`
    }
  }
  return ''
}

async function assertStudent(userId) {
  const id = Number(userId)
  if (!id) {
    const err = new Error('请先选择学员')
    err.code = 10001
    throw err
  }
  return adminService.getStudent(id)
}

function buildImportTemplateBuffer({ studentNickname = '' } = {}) {
  const wb = XLSX.utils.book_new()
  const studentLine = studentNickname ? `当前学员：${studentNickname}` : '请先在网页上选择学员后再下载模板'

  const guide = [
    ['学习任务批量导入 — 填写说明'],
    [''],
    [studentLine],
    [''],
    ['1. 在「任务数据」工作表按列填写，表头勿改'],
    ['2. 表格中无需填写手机号，学员已在网页选定'],
    ['3. 日期：格式 YYYY-MM-DD，如 2026-06-15'],
    ['4. 目标分钟：可留空，默认 60'],
    ['5. 保存后上传至「批量导入」页（须同一学员）']
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), '填写说明')

  const data = [
    TEMPLATE_HEADERS,
    ['2026-06-01', '政治', '复习马原第一章', 60],
    ['2026-06-01', '英语', '背诵单词 Unit 5', 45]
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), '任务数据')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}

function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName =
    wb.SheetNames.find((n) => n.includes('任务')) ||
    wb.SheetNames.find((n) => !n.includes('说明')) ||
    wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  if (!rows.length) {
    const err = new Error('表格为空')
    err.code = 10001
    throw err
  }

  let headerRowIndex = rows.findIndex((row) =>
    row.some((c) => {
      const t = normalizeHeader(c)
      return t.includes('科目') || t.includes('日期')
    })
  )
  if (headerRowIndex < 0) headerRowIndex = 0

  const headerMap = buildHeaderMap(rows[headerRowIndex])
  if (headerMap.subject === undefined || headerMap.content === undefined) {
    const err = new Error('缺少必要列：科目、任务内容（请使用平台模板）')
    err.code = 10001
    throw err
  }
  if (headerMap.date === undefined) {
    const err = new Error('缺少必要列：日期')
    err.code = 10001
    throw err
  }

  const dataRows = []
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !row.some((c) => String(c).trim())) continue
    dataRows.push({ rowNum: i + 1, row, headerMap })
  }
  return dataRows
}

async function importPlanItemsFromBuffer(adminId, buffer, userId) {
  const student = await assertStudent(userId)
  const parsedRows = parseWorkbook(buffer)
  if (!parsedRows.length) {
    const err = new Error('没有可导入的数据行')
    err.code = 10001
    throw err
  }

  const result = { success: 0, failed: 0, studentName: student.nickname, errors: [] }

  for (const { rowNum, row, headerMap } of parsedRows) {
    const date = parseDate(cellVal(row, headerMap.date))
    const subject = cellVal(row, headerMap.subject)
    const content = cellVal(row, headerMap.content)
    let targetMinutes = cellVal(row, headerMap.targetMinutes)
    targetMinutes = targetMinutes === '' ? 60 : Number(targetMinutes)

    try {
      if (!subject || !content) throw new Error('科目和任务内容不能为空')
      if (!date) throw new Error('日期格式无效，请用 YYYY-MM-DD')
      if (Number.isNaN(targetMinutes) || targetMinutes < 0) throw new Error('目标分钟无效')

      await adminService.createPlanItem(adminId, {
        userId: student.id,
        date,
        subject,
        content,
        targetMinutes
      })
      result.success += 1
    } catch (e) {
      result.failed += 1
      result.errors.push({ row: rowNum, message: e.message || '导入失败' })
    }
  }

  return result
}

module.exports = {
  buildImportTemplateBuffer,
  importPlanItemsFromBuffer
}
