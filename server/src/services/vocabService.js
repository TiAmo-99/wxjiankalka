const db = require('../db')

function hashSlot(key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mapWord(row) {
  return {
    id: row.id,
    word: row.word,
    phonetic: row.phonetic || '',
    meaningZh: row.meaning_zh,
    exampleEn: row.example_en || '',
    exampleZh: row.example_zh || ''
  }
}

function mapPhrase(row) {
  return {
    id: row.id,
    kind: row.kind || 'phrase',
    title: row.title || '',
    phraseEn: row.phrase_en,
    meaningZh: row.meaning_zh
  }
}

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

async function listActiveWordIds(tag = 'kaoyan') {
  const rows = await db.all(
    `SELECT id FROM vocabulary_words WHERE status = 1 AND tags LIKE ? ORDER BY id`,
    [`%${tag}%`]
  )
  return rows.map((r) => r.id)
}

async function getWordsByIds(ids) {
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(',')
  const rows = await db.all(
    `SELECT * FROM vocabulary_words WHERE id IN (${placeholders}) AND status = 1`,
    ids
  )
  const order = new Map(ids.map((id, i) => [id, i]))
  rows.sort((a, b) => order.get(a.id) - order.get(b.id))
  return rows.map(mapWord)
}

/** 今日预览：同一天返回固定若干词 */
async function getPreview(count = 3, date = todayStr(), tag = 'kaoyan') {
  const ids = await listActiveWordIds(tag)
  if (!ids.length) return { date, words: [], empty: true }

  const ranked = ids
    .map((id) => ({ id, score: hashSlot(`${date}:${id}`) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.min(count, ids.length))

  const pickIds = ranked.map((r) => r.id)
  return { date, words: await getWordsByIds(pickIds), empty: false }
}

/** 随机一组学习词 + 可选短语 */
async function getSet({ wordCount = 10, withPhrase = true, tag = 'kaoyan' } = {}) {
  const n = Math.min(Math.max(Number(wordCount) || 10, 1), 30)
  const rows = await db.all(
    `SELECT * FROM vocabulary_words WHERE status = 1 AND tags LIKE ? ORDER BY RAND() LIMIT ?`,
    [`%${tag}%`, n]
  )
  const words = rows.map(mapWord)

  let phrase = null
  if (withPhrase) {
    const p = await db.get(
      `SELECT * FROM vocabulary_phrases WHERE status = 1 AND tags LIKE ? ORDER BY RAND() LIMIT 1`,
      [`%${tag}%`]
    )
    if (p) phrase = mapPhrase(p)
  }

  return { words, phrase, empty: words.length === 0 }
}

async function getStats() {
  const w = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_words WHERE status = 1`)
  const p = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_phrases WHERE status = 1`)
  return { wordCount: Number(w.c), phraseCount: Number(p.c) }
}

module.exports = {
  getPreview,
  getSet,
  getStats,
  mapWord,
  mapPhrase
}
