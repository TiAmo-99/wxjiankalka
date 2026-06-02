const fs = require('fs')
const path = require('path')
const db = require('../src/db/client')
const { phraseContentHash } = require('../src/utils/vocabHash')

function normalizeWordItem(raw) {
  const word = String(raw.word || raw.spelling || raw.en || '').trim().toLowerCase()
  if (!word) return null

  let meaningZh = raw.meaningZh || raw.meaning_zh || raw.paraphrase || raw.translation || ''
  if (!meaningZh && Array.isArray(raw.translations)) {
    meaningZh = raw.translations
      .map((t) => (typeof t === 'string' ? t : t.translation || t.meaning || ''))
      .filter(Boolean)
      .join('；')
  }
  if (!meaningZh && typeof raw.meaning === 'string') meaningZh = raw.meaning
  meaningZh = String(meaningZh).trim().slice(0, 512)
  if (!meaningZh) return null

  const phonetic = String(raw.phonetic || raw.uk || raw.USphonetic || raw.UKphonetic || '').trim().slice(0, 128)
  const exampleEn = String(raw.exampleEn || raw.example_en || raw.example || '').trim().slice(0, 512)
  const exampleZh = String(raw.exampleZh || raw.example_zh || '').trim().slice(0, 512)
  const tags = String(raw.tags || 'kaoyan').trim().slice(0, 128) || 'kaoyan'

  return { word, phonetic: phonetic || null, meaningZh, exampleEn: exampleEn || null, exampleZh: exampleZh || null, tags }
}

const PHRASE_KINDS = new Set(['phrase', 'sentence', 'passage'])

function normalizePhraseItem(raw) {
  const phraseEn = String(raw.phraseEn || raw.phrase_en || raw.phrase || raw.en || raw.contentEn || '').trim()
  const meaningZh = String(raw.meaningZh || raw.meaning_zh || raw.translation || raw.cn || '').trim()
  if (!phraseEn || !meaningZh) return null
  let kind = String(raw.kind || 'phrase').trim().toLowerCase()
  if (!PHRASE_KINDS.has(kind)) kind = 'phrase'
  const title = String(raw.title || '').trim().slice(0, 120) || null
  const tags = String(raw.tags || 'kaoyan').trim().slice(0, 128) || 'kaoyan'
  const contentHash = phraseContentHash(kind, phraseEn)
  return { kind, title, phraseEn, meaningZh, tags, contentHash }
}

function parseFileData(data) {
  let words = []
  let phrases = []

  if (Array.isArray(data)) {
    words = data
  } else if (data && typeof data === 'object') {
    words = data.words || data.wordList || []
    phrases = data.phrases || data.phraseList || []
  }

  return { words, phrases }
}

async function upsertWord(item) {
  await db.run(
    `INSERT INTO vocabulary_words (word, phonetic, meaning_zh, example_en, example_zh, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       phonetic = COALESCE(VALUES(phonetic), phonetic),
       meaning_zh = VALUES(meaning_zh),
       example_en = COALESCE(VALUES(example_en), example_en),
       example_zh = COALESCE(VALUES(example_zh), example_zh),
       tags = VALUES(tags),
       status = 1`,
    [item.word, item.phonetic, item.meaningZh, item.exampleEn, item.exampleZh, item.tags]
  )
}

async function upsertPhrase(item) {
  await db.run(
    `INSERT INTO vocabulary_phrases (kind, title, phrase_en, meaning_zh, content_hash, tags, status)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       kind = VALUES(kind),
       title = VALUES(title),
       phrase_en = VALUES(phrase_en),
       meaning_zh = VALUES(meaning_zh),
       tags = VALUES(tags),
       status = 1`,
    [item.kind, item.title, item.phraseEn, item.meaningZh, item.contentHash, item.tags]
  )
}

/** 仅导入语料 JSON：{ "phrases": [...] } */
async function importPhrasesFromFile(filePath, opts = {}) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`文件不存在: ${abs}`)
  }
  const data = JSON.parse(fs.readFileSync(abs, 'utf8'))
  const phraseRows = data.phrases || data.phraseList || (Array.isArray(data) ? data : [])
  let phrases = 0
  let skipped = 0
  for (const row of phraseRows) {
    const item = normalizePhraseItem(row)
    if (!item) {
      skipped++
      continue
    }
    await upsertPhrase(item)
    phrases++
  }
  if (!opts.silent) {
    console.log(`Import phrases: ${phrases} ok, ${skipped} skipped`)
    console.log(`File: ${abs}`)
  }
  return { phrases, skipped }
}

/**
 * @param {string} filePath
 * @param {{ silent?: boolean }} opts
 */
async function importWordRows(wordRows, opts = {}) {
  let words = 0
  let phrases = 0
  let skipped = 0

  for (const row of wordRows) {
    const item = normalizeWordItem(row)
    if (!item) {
      skipped++
      continue
    }
    await upsertWord(item)
    words++

    if (Array.isArray(row.phrases)) {
      for (const p of row.phrases) {
        const ph = normalizePhraseItem(p)
        if (!ph) {
          skipped++
          continue
        }
        await upsertPhrase(ph)
        phrases++
      }
    }
  }

  return { words, phrases, skipped }
}

/**
 * KyleBing 乱序 txt：每行「单词\\t释义」
 */
async function importVocabFromTxt(filePath, opts = {}) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`文件不存在: ${abs}`)
  }
  const lines = fs.readFileSync(abs, 'utf8').split(/\r?\n/)
  const wordRows = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const tab = trimmed.indexOf('\t')
    if (tab <= 0) continue
    wordRows.push({
      word: trimmed.slice(0, tab).trim(),
      translations: [trimmed.slice(tab + 1).trim()],
      tags: opts.tags || 'kaoyan'
    })
  }
  const result = await importWordRows(wordRows, opts)
  if (!opts.silent) {
    console.log(`Import TXT done: ${result.words} words, ${result.skipped} skipped`)
    console.log(`File: ${abs}`)
  }
  return { ...result, phrases: result.phrases || 0 }
}

async function importVocabFromJson(filePath, opts = {}) {
  const abs = path.resolve(filePath)
  const raw = fs.readFileSync(abs, 'utf8')
  const data = JSON.parse(raw)
  const { words: wordRows, phrases: phraseRows } = parseFileData(data)

  const result = await importWordRows(wordRows, opts)
  let phrases = result.phrases

  for (const row of phraseRows) {
    const item = normalizePhraseItem(row)
    if (!item) {
      result.skipped++
      continue
    }
    await upsertPhrase(item)
    phrases++
  }

  if (!opts.silent) {
    console.log(`Import JSON done: ${result.words} words, ${phrases} phrases, ${result.skipped} skipped`)
    console.log(`File: ${abs}`)
  }

  return { words: result.words, phrases, skipped: result.skipped }
}

/**
 * @param {string} filePath .json 或 .txt
 * @param {{ silent?: boolean, tags?: string }} opts
 */
async function importVocabFromFile(filePath, opts = {}) {
  const abs = path.resolve(filePath)
  if (!fs.existsSync(abs)) {
    throw new Error(`文件不存在: ${abs}`)
  }
  const ext = path.extname(abs).toLowerCase()
  if (ext === '.txt') {
    return importVocabFromTxt(abs, opts)
  }
  if (ext === '.json') {
    return importVocabFromJson(abs, opts)
  }
  throw new Error(`不支持的文件类型: ${ext}（请使用 .json 或 .txt）`)
}

module.exports = {
  importVocabFromFile,
  importVocabFromTxt,
  importVocabFromJson,
  importPhrasesFromFile,
  normalizeWordItem,
  normalizePhraseItem
}
