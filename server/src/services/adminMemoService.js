const db = require('../db')
const memoService = require('./memoService')

function formatDateTime(val) {
  if (!val) return ''
  const s = val instanceof Date ? val.toISOString() : String(val)
  return s.slice(0, 19).replace('T', ' ')
}

function mapAdminMemo(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    userNickname: row.nickname || '',
    userPhone: row.phone || '',
    userRealName: row.real_name || '',
    title: row.title || '',
    content: row.content || '',
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at)
  }
}

async function listAllMemos({ page = 1, pageSize = 20, keyword = '', userId = '' } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
  const offset = (p - 1) * size

  let where = 'WHERE 1=1'
  const params = []

  const uid = Number(userId)
  if (userId !== '' && userId !== undefined && !Number.isNaN(uid) && uid > 0) {
    where += ' AND m.user_id = ?'
    params.push(uid)
  }

  const kw = String(keyword || '').trim()
  if (kw) {
    where += ' AND (m.title LIKE ? OR m.content LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ? OR u.real_name LIKE ?)'
    const like = `%${kw}%`
    params.push(like, like, like, like, like)
  }

  const countRow = await db.get(
    `SELECT COUNT(*) AS c FROM memos m LEFT JOIN users u ON u.id = m.user_id ${where}`,
    params
  )
  const rows = await db.all(
    `SELECT m.*, u.nickname, u.phone, u.real_name
     FROM memos m
     LEFT JOIN users u ON u.id = m.user_id
     ${where}
     ORDER BY m.updated_at DESC, m.id DESC
     LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  return {
    list: rows.map(mapAdminMemo),
    total: Number(countRow.c),
    page: p,
    pageSize: size
  }
}

async function getMemoById(id) {
  const row = await db.get(
    `SELECT m.*, u.nickname, u.phone, u.real_name
     FROM memos m
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.id = ?`,
    [id]
  )
  if (!row) {
    const err = new Error('备忘录不存在')
    err.code = 30004
    throw err
  }
  return mapAdminMemo(row)
}

async function createMemoForUser(body) {
  const userId = Number(body.userId ?? body.user_id)
  if (!userId) {
    const err = new Error('请选择学员')
    err.code = 10001
    throw err
  }
  const user = await db.get(`SELECT id FROM users WHERE id = ?`, [userId])
  if (!user) {
    const err = new Error('学员不存在')
    err.code = 30004
    throw err
  }
  const memo = await memoService.createMemo(userId, body)
  return getMemoById(memo.id)
}

async function updateMemoById(id, body) {
  const row = await db.get(`SELECT id, user_id FROM memos WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('备忘录不存在')
    err.code = 30004
    throw err
  }
  await memoService.updateMemo(row.user_id, id, body)
  return getMemoById(id)
}

async function removeMemoById(id) {
  const row = await db.get(`SELECT id FROM memos WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('备忘录不存在')
    err.code = 30004
    throw err
  }
  await db.run(`DELETE FROM memos WHERE id = ?`, [id])
  return { ok: true }
}

async function getStats() {
  const row = await db.get(`SELECT COUNT(*) AS total FROM memos`)
  const todayRow = await db.get(
    `SELECT COUNT(*) AS c FROM memos WHERE DATE(created_at) = CURDATE()`
  )
  return {
    total: Number(row?.total || 0),
    todayCreated: Number(todayRow?.c || 0)
  }
}

module.exports = {
  listAllMemos,
  getMemoById,
  createMemoForUser,
  updateMemoById,
  removeMemoById,
  getStats
}
