const db = require('../db')

function mapRow(row) {
  return {
    id: row.id,
    content: row.content,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  }
}

async function listAll({ status = '' } = {}) {
  let sql = `SELECT * FROM encouragement_messages WHERE 1=1`
  const params = []
  if (status) {
    sql += ` AND status = ?`
    params.push(status)
  }
  sql += ` ORDER BY sort_order ASC, id DESC`
  const rows = await db.all(sql, params)
  return rows.map(mapRow)
}

async function getRandom() {
  const row = await db.get(
    `SELECT * FROM encouragement_messages WHERE status = 'active' ORDER BY RAND() LIMIT 1`
  )
  if (!row) {
    return { content: '坚持就是胜利，加油！' }
  }
  return { id: row.id, content: row.content }
}

async function create(body) {
  const content = String(body.content || '').trim()
  if (!content) {
    const err = new Error('请填写鼓励语内容')
    err.code = 10001
    throw err
  }
  if (content.length > 500) {
    const err = new Error('内容不超过 500 字')
    err.code = 10001
    throw err
  }
  const sortOrder = Number(body.sortOrder ?? body.sort_order ?? 0)
  const result = await db.run(
    `INSERT INTO encouragement_messages (content, status, sort_order) VALUES (?, 'active', ?)`,
    [content, sortOrder]
  )
  const row = await db.get(`SELECT * FROM encouragement_messages WHERE id = ?`, [result.insertId])
  return mapRow(row)
}

async function update(id, body) {
  const row = await db.get(`SELECT * FROM encouragement_messages WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('记录不存在')
    err.code = 30004
    throw err
  }

  const fields = []
  const params = []

  if (body.content !== undefined) {
    const content = String(body.content).trim()
    if (!content) {
      const err = new Error('内容不能为空')
      err.code = 10001
      throw err
    }
    fields.push('content = ?')
    params.push(content.slice(0, 500))
  }
  if (body.status !== undefined) {
    if (!['active', 'disabled'].includes(body.status)) {
      const err = new Error('状态无效')
      err.code = 10001
      throw err
    }
    fields.push('status = ?')
    params.push(body.status)
  }
  if (body.sortOrder !== undefined || body.sort_order !== undefined) {
    fields.push('sort_order = ?')
    params.push(Number(body.sortOrder ?? body.sort_order ?? 0))
  }

  if (!fields.length) {
    const err = new Error('没有可更新字段')
    err.code = 10001
    throw err
  }

  params.push(id)
  await db.run(`UPDATE encouragement_messages SET ${fields.join(', ')} WHERE id = ?`, params)
  const updated = await db.get(`SELECT * FROM encouragement_messages WHERE id = ?`, [id])
  return mapRow(updated)
}

async function remove(id) {
  const row = await db.get(`SELECT id FROM encouragement_messages WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('记录不存在')
    err.code = 30004
    throw err
  }
  await db.run(`DELETE FROM encouragement_messages WHERE id = ?`, [id])
  return { ok: true }
}

module.exports = {
  listAll,
  getRandom,
  create,
  update,
  remove
}
