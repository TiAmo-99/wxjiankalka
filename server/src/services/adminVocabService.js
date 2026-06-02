const db = require('../db')
const { phraseContentHash } = require('../utils/vocabHash')

const PHRASE_KINDS = new Set(['phrase', 'sentence', 'passage'])

function mapWord(row) {
  return {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic || '',
    meaningZh: row.meaning_zh,
    exampleEn: row.example_en || '',
    exampleZh: row.example_zh || '',
    tags: row.tags || 'kaoyan',
    status: Number(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapPhrase(row) {
  return {
    id: row.id,
    kind: row.kind || 'phrase',
    title: row.title || '',
    phraseEn: row.phrase_en,
    meaningZh: row.meaning_zh,
    tags: row.tags || 'kaoyan',
    status: Number(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

async function getAdminStats() {
  const total = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_words`)
  const active = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_words WHERE status = 1`)
  const disabled = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_words WHERE status = 0`)
  const phrases = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_phrases WHERE status = 1`)
  const phraseOnly = await db.get(
    `SELECT COUNT(*) AS c FROM vocabulary_phrases WHERE status = 1 AND kind = 'phrase'`
  )
  const sentenceCount = await db.get(
    `SELECT COUNT(*) AS c FROM vocabulary_phrases WHERE status = 1 AND kind = 'sentence'`
  )
  const passageCount = await db.get(
    `SELECT COUNT(*) AS c FROM vocabulary_phrases WHERE status = 1 AND kind = 'passage'`
  )
  return {
    totalWords: Number(total.c),
    activeWords: Number(active.c),
    disabledWords: Number(disabled.c),
    phraseCount: Number(phrases.c),
    phraseKindCount: Number(phraseOnly.c),
    sentenceCount: Number(sentenceCount.c),
    passageCount: Number(passageCount.c)
  }
}

async function listWords({ page = 1, pageSize = 20, keyword = '', status = '', tag = '' } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
  const offset = (p - 1) * size

  let where = 'WHERE 1=1'
  const params = []

  if (keyword.trim()) {
    where += ' AND (word LIKE ? OR meaning_zh LIKE ?)'
    const kw = `%${keyword.trim()}%`
    params.push(kw, kw)
  }
  if (status === '1' || status === '0') {
    where += ' AND status = ?'
    params.push(Number(status))
  }
  if (tag.trim()) {
    where += ' AND tags LIKE ?'
    params.push(`%${tag.trim()}%`)
  }

  const countRow = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_words ${where}`, params)
  const rows = await db.all(
    `SELECT * FROM vocabulary_words ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  return {
    list: rows.map(mapWord),
    total: Number(countRow.c),
    page: p,
    pageSize: size
  }
}

async function getWord(id) {
  const row = await db.get(`SELECT * FROM vocabulary_words WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('单词不存在')
    err.code = 30004
    throw err
  }
  return mapWord(row)
}

async function createWord(body) {
  const word = String(body.word || '').trim().toLowerCase()
  const meaningZh = String(body.meaningZh ?? body.meaning_zh ?? '').trim()
  if (!word) {
    const err = new Error('请填写英文单词')
    err.code = 10001
    throw err
  }
  if (!meaningZh) {
    const err = new Error('请填写中文释义')
    err.code = 10001
    throw err
  }
  if (word.length > 64) {
    const err = new Error('单词过长')
    err.code = 10001
    throw err
  }

  const exists = await db.get(`SELECT id FROM vocabulary_words WHERE word = ?`, [word])
  if (exists) {
    const err = new Error(`单词「${word}」已存在`)
    err.code = 10001
    throw err
  }

  const phonetic = String(body.phonetic || '').trim().slice(0, 128) || null
  const exampleEn = String(body.exampleEn ?? body.example_en ?? '').trim().slice(0, 512) || null
  const exampleZh = String(body.exampleZh ?? body.example_zh ?? '').trim().slice(0, 512) || null
  const tags = String(body.tags || 'kaoyan').trim().slice(0, 128) || 'kaoyan'
  const status = body.status === 0 || body.status === '0' ? 0 : 1

  const result = await db.run(
    `INSERT INTO vocabulary_words (word, phonetic, meaning_zh, example_en, example_zh, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [word, phonetic, meaningZh.slice(0, 512), exampleEn, exampleZh, tags, status]
  )
  return getWord(result.insertId)
}

async function updateWord(id, body) {
  const row = await db.get(`SELECT * FROM vocabulary_words WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('单词不存在')
    err.code = 30004
    throw err
  }

  const fields = []
  const params = []

  if (body.word !== undefined) {
    const word = String(body.word).trim().toLowerCase()
    if (!word) {
      const err = new Error('单词不能为空')
      err.code = 10001
      throw err
    }
    const dup = await db.get(`SELECT id FROM vocabulary_words WHERE word = ? AND id <> ?`, [word, id])
    if (dup) {
      const err = new Error(`单词「${word}」已存在`)
      err.code = 10001
      throw err
    }
    fields.push('word = ?')
    params.push(word.slice(0, 64))
  }

  if (body.meaningZh !== undefined || body.meaning_zh !== undefined) {
    const meaningZh = String(body.meaningZh ?? body.meaning_zh ?? '').trim()
    if (!meaningZh) {
      const err = new Error('中文释义不能为空')
      err.code = 10001
      throw err
    }
    fields.push('meaning_zh = ?')
    params.push(meaningZh.slice(0, 512))
  }

  if (body.phonetic !== undefined) {
    const phonetic = String(body.phonetic || '').trim().slice(0, 128)
    fields.push('phonetic = ?')
    params.push(phonetic || null)
  }

  if (body.exampleEn !== undefined || body.example_en !== undefined) {
    const v = String(body.exampleEn ?? body.example_en ?? '').trim().slice(0, 512)
    fields.push('example_en = ?')
    params.push(v || null)
  }

  if (body.exampleZh !== undefined || body.example_zh !== undefined) {
    const v = String(body.exampleZh ?? body.example_zh ?? '').trim().slice(0, 512)
    fields.push('example_zh = ?')
    params.push(v || null)
  }

  if (body.tags !== undefined) {
    fields.push('tags = ?')
    params.push(String(body.tags || 'kaoyan').trim().slice(0, 128) || 'kaoyan')
  }

  if (body.status !== undefined) {
    fields.push('status = ?')
    params.push(body.status === 0 || body.status === '0' ? 0 : 1)
  }

  if (!fields.length) {
    const err = new Error('没有可更新字段')
    err.code = 10001
    throw err
  }

  params.push(id)
  await db.run(`UPDATE vocabulary_words SET ${fields.join(', ')} WHERE id = ?`, params)
  return getWord(id)
}

async function removeWord(id) {
  const row = await db.get(`SELECT id FROM vocabulary_words WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('单词不存在')
    err.code = 30004
    throw err
  }
  await db.run(`DELETE FROM vocabulary_words WHERE id = ?`, [id])
  return { ok: true }
}

async function listPhrases({ page = 1, pageSize = 20, keyword = '', status = '', kind = '' } = {}) {
  const p = Math.max(1, Number(page) || 1)
  const size = Math.min(Math.max(Number(pageSize) || 20, 1), 100)
  const offset = (p - 1) * size

  let where = 'WHERE 1=1'
  const params = []

  if (keyword.trim()) {
    where += ' AND (phrase_en LIKE ? OR meaning_zh LIKE ? OR title LIKE ?)'
    const kw = `%${keyword.trim()}%`
    params.push(kw, kw, kw)
  }
  if (status === '1' || status === '0') {
    where += ' AND status = ?'
    params.push(Number(status))
  }
  if (kind && PHRASE_KINDS.has(kind)) {
    where += ' AND kind = ?'
    params.push(kind)
  }

  const countRow = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_phrases ${where}`, params)
  const rows = await db.all(
    `SELECT * FROM vocabulary_phrases ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, size, offset]
  )

  return {
    list: rows.map(mapPhrase),
    total: Number(countRow.c),
    page: p,
    pageSize: size
  }
}

async function getPhrase(id) {
  const row = await db.get(`SELECT * FROM vocabulary_phrases WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('语料不存在')
    err.code = 30004
    throw err
  }
  return mapPhrase(row)
}

async function createPhrase(body) {
  const phraseEn = String(body.phraseEn ?? body.phrase_en ?? '').trim()
  const meaningZh = String(body.meaningZh ?? body.meaning_zh ?? '').trim()
  if (!phraseEn) {
    const err = new Error('请填写英文内容')
    err.code = 10001
    throw err
  }
  if (!meaningZh) {
    const err = new Error('请填写中文释义')
    err.code = 10001
    throw err
  }
  let kind = String(body.kind || 'phrase').trim().toLowerCase()
  if (!PHRASE_KINDS.has(kind)) kind = 'phrase'
  const title = String(body.title || '').trim().slice(0, 120) || null
  const tags = String(body.tags || 'kaoyan').trim().slice(0, 128) || 'kaoyan'
  const status = body.status === 0 || body.status === '0' ? 0 : 1
  const contentHash = phraseContentHash(kind, phraseEn)

  const dup = await db.get(`SELECT id FROM vocabulary_phrases WHERE content_hash = ?`, [contentHash])
  if (dup) {
    const err = new Error('相同语料已存在')
    err.code = 10001
    throw err
  }

  const result = await db.run(
    `INSERT INTO vocabulary_phrases (kind, title, phrase_en, meaning_zh, content_hash, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [kind, title, phraseEn, meaningZh, contentHash, tags, status]
  )
  return getPhrase(result.insertId)
}

async function updatePhrase(id, body) {
  const row = await db.get(`SELECT * FROM vocabulary_phrases WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('语料不存在')
    err.code = 30004
    throw err
  }

  const nextKind =
    body.kind !== undefined
      ? PHRASE_KINDS.has(String(body.kind).trim().toLowerCase())
        ? String(body.kind).trim().toLowerCase()
        : row.kind
      : row.kind
  const nextEn =
    body.phraseEn !== undefined || body.phrase_en !== undefined
      ? String(body.phraseEn ?? body.phrase_en ?? '').trim()
      : row.phrase_en
  const nextZh =
    body.meaningZh !== undefined || body.meaning_zh !== undefined
      ? String(body.meaningZh ?? body.meaning_zh ?? '').trim()
      : row.meaning_zh

  if (!nextEn || !nextZh) {
    const err = new Error('英文内容与中文释义不能为空')
    err.code = 10001
    throw err
  }

  const nextHash = phraseContentHash(nextKind, nextEn)
  const dup = await db.get(`SELECT id FROM vocabulary_phrases WHERE content_hash = ? AND id <> ?`, [
    nextHash,
    id
  ])
  if (dup) {
    const err = new Error('与其他语料重复')
    err.code = 10001
    throw err
  }

  const fields = [
    'kind = ?',
    'phrase_en = ?',
    'meaning_zh = ?',
    'content_hash = ?'
  ]
  const params = [nextKind, nextEn, nextZh, nextHash]

  if (body.title !== undefined) {
    fields.push('title = ?')
    params.push(String(body.title || '').trim().slice(0, 120) || null)
  }
  if (body.tags !== undefined) {
    fields.push('tags = ?')
    params.push(String(body.tags || 'kaoyan').trim().slice(0, 128) || 'kaoyan')
  }
  if (body.status !== undefined) {
    fields.push('status = ?')
    params.push(body.status === 0 || body.status === '0' ? 0 : 1)
  }

  params.push(id)
  await db.run(`UPDATE vocabulary_phrases SET ${fields.join(', ')} WHERE id = ?`, params)
  return getPhrase(id)
}

async function removePhrase(id) {
  const row = await db.get(`SELECT id FROM vocabulary_phrases WHERE id = ?`, [id])
  if (!row) {
    const err = new Error('语料不存在')
    err.code = 30004
    throw err
  }
  await db.run(`DELETE FROM vocabulary_phrases WHERE id = ?`, [id])
  return { ok: true }
}

module.exports = {
  getAdminStats,
  listWords,
  getWord,
  createWord,
  updateWord,
  removeWord,
  mapWord,
  listPhrases,
  getPhrase,
  createPhrase,
  updatePhrase,
  removePhrase,
  mapPhrase
}
