const db = require('../db')

function formatDateTime(val) {
  if (!val) return ''
  const s = val instanceof Date ? val.toISOString() : String(val)
  return s.slice(0, 19).replace('T', ' ')
}

function mapMemo(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title || '',
    content: row.content || '',
    createdAt: formatDateTime(row.created_at),
    updatedAt: formatDateTime(row.updated_at)
  }
}

async function listMemos(userId, { page = 1, pageSize = 50, keyword = '' } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const size = Math.min(Math.max(Number(pageSize) || 50, 1), 100)
  const offset = (p - 1) * size

  let where = 'WHERE user_id = ?'
  const params = [userId]

  const kw = String(keyword || '').trim()
  if (kw) {
    where += ' AND (title LIKE ? OR content LIKE ?)'
    const like = `%${kw}%`
    params.push(like, like)
  }

  const countRow = await db.get(`SELECT COUNT(*) AS c FROM memos ${where}`, params)
  const rows = await db.all(
    `SELECT * FROM memos ${where} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  return {
    list: rows.map(mapMemo),
    total: Number(countRow.c),
    page: p,
    pageSize: size
  }
}

async function getMemo(userId, id) {
  const row = await db.get(`SELECT * FROM memos WHERE id = ? AND user_id = ?`, [id, userId])
  if (!row) {
    const err = new Error('备忘录不存在')
    err.code = 30004
    throw err
  }
  return mapMemo(row)
}

async function createMemo(userId, body) {
  const title = String(body.title || '').trim().slice(0, 120)
  const content = String(body.content || '').trim()
  if (!content) {
    const err = new Error('请填写备忘录内容')
    err.code = 10001
    throw err
  }
  if (content.length > 10000) {
    const err = new Error('内容不超过 10000 字')
    err.code = 10001
    throw err
  }

  const result = await db.run(`INSERT INTO memos (user_id, title, content) VALUES (?, ?, ?)`, [
    userId,
    title,
    content
  ])
  return getMemo(userId, result.insertId)
}

async function updateMemo(userId, id, body) {
  const row = await db.get(`SELECT id FROM memos WHERE id = ? AND user_id = ?`, [id, userId])
  if (!row) {
    const err = new Error('备忘录不存在')
    err.code = 30004
    throw err
  }

  const fields = []
  const params = []

  if (body.title !== undefined) {
    fields.push('title = ?')
    params.push(String(body.title || '').trim().slice(0, 120))
  }
  if (body.content !== undefined) {
    const content = String(body.content || '').trim()
    if (!content) {
      const err = new Error('请填写备忘录内容')
      err.code = 10001
      throw err
    }
    if (content.length > 10000) {
      const err = new Error('内容不超过 10000 字')
      err.code = 10001
      throw err
    }
    fields.push('content = ?')
    params.push(content)
  }

  if (!fields.length) {
    return getMemo(userId, id)
  }

  params.push(id, userId)
  await db.run(`UPDATE memos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, params)
  return getMemo(userId, id)
}

async function removeMemo(userId, id) {
  const row = await db.get(`SELECT id FROM memos WHERE id = ? AND user_id = ?`, [id, userId])
  if (!row) {
    const err = new Error('备忘录不存在')
    err.code = 30004
    throw err
  }
  await db.run(`DELETE FROM memos WHERE id = ? AND user_id = ?`, [id, userId])
  return { ok: true }
}

module.exports = {
  listMemos,
  getMemo,
  createMemo,
  updateMemo,
  removeMemo,
  mapMemo
}
