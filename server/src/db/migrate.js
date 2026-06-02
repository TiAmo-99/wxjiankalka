const fs = require('fs')
const path = require('path')
const config = require('../config')
const db = require('./client')

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && !s.startsWith('SET '))

  for (const statement of statements) {
    if (statement) await db.exec(`${statement};`)
  }

  await applyPatches()
  console.log('Migration OK:', config.mysql.database)
}

async function columnExists(table, column) {
  const row = await db.get(
    `SELECT COUNT(*) AS c FROM information_schema.columns
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [config.mysql.database, table, column]
  )
  return Number(row.c) > 0
}

async function indexExists(table, indexName) {
  const row = await db.get(
    `SELECT COUNT(*) AS c FROM information_schema.statistics
     WHERE table_schema = ? AND table_name = ? AND index_name = ?`,
    [config.mysql.database, table, indexName]
  )
  return Number(row.c) > 0
}

/** 已有库升级：补注册相关字段 */
async function applyPatches() {
  if (!(await columnExists('users', 'real_name'))) {
    await db.exec(`ALTER TABLE users ADD COLUMN real_name VARCHAR(50) NOT NULL DEFAULT '' AFTER nickname`)
  }
  if (!(await columnExists('users', 'avatar_url'))) {
    await db.exec(`ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL AFTER phone`)
  }
  if (!(await indexExists('users', 'uk_users_phone'))) {
    await db.exec(`ALTER TABLE users ADD UNIQUE KEY uk_users_phone (phone)`)
  }

  await ensureEncouragementTable()
  await applyUserProfilePatches()
  await ensureEmailNotifyLogsTable()
  await applyPermissionPatches()
  await ensureVocabularyTables()
  await applyVocabularyPhrasePatches()
  await ensureMemosTable()
}

async function ensureMemosTable() {
  if (await tableExists('memos')) return
  const sqlPath = path.join(__dirname, 'migrations', 'memos.sql')
  if (!fs.existsSync(sqlPath)) return
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'))
  for (const statement of statements) {
    if (statement) await db.exec(`${statement};`)
  }
}

async function ensureVocabularyTables() {
  const vocabSqlPath = path.join(__dirname, 'migrations', 'vocabulary.sql')
  if (!fs.existsSync(vocabSqlPath)) return
  const sql = fs.readFileSync(vocabSqlPath, 'utf8')
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'))
  for (const statement of statements) {
    if (statement) await db.exec(`${statement};`)
  }
  await seedVocabularyIfEmpty()
}

async function seedVocabularyIfEmpty() {
  const row = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_words`)
  if (Number(row.c) > 0) return
  const seedPath = path.join(__dirname, '..', '..', 'data', 'vocab-kaoyan-seed.json')
  if (!fs.existsSync(seedPath)) {
    console.log('Vocabulary tables ready (no seed file, run npm run db:import-vocab)')
    return
  }
  const { importVocabFromFile } = require('../../scripts/import-vocab-lib')
  const result = await importVocabFromFile(seedPath, { silent: true })
  console.log(`Vocabulary seeded: ${result.words} words, ${result.phrases} phrases`)
}

async function applyVocabularyPhrasePatches() {
  if (!(await tableExists('vocabulary_phrases'))) return

  if (!(await columnExists('vocabulary_phrases', 'kind'))) {
    await db.exec(
      `ALTER TABLE vocabulary_phrases ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'phrase' COMMENT 'phrase|sentence|passage' AFTER id`
    )
  }
  if (!(await columnExists('vocabulary_phrases', 'title'))) {
    await db.exec(`ALTER TABLE vocabulary_phrases ADD COLUMN title VARCHAR(120) DEFAULT NULL AFTER kind`)
  }
  if (!(await columnExists('vocabulary_phrases', 'content_hash'))) {
    await db.exec(`ALTER TABLE vocabulary_phrases ADD COLUMN content_hash CHAR(32) DEFAULT NULL AFTER meaning_zh`)
  }
  if (!(await columnExists('vocabulary_phrases', 'updated_at'))) {
    await db.exec(
      `ALTER TABLE vocabulary_phrases ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
    )
  }

  try {
    await db.exec(`ALTER TABLE vocabulary_phrases MODIFY phrase_en TEXT NOT NULL`)
    await db.exec(`ALTER TABLE vocabulary_phrases MODIFY meaning_zh TEXT NOT NULL`)
  } catch (e) {
    /* 已为目标类型时忽略 */
  }

  if (await indexExists('vocabulary_phrases', 'uk_vocab_phrase')) {
    await db.exec(`ALTER TABLE vocabulary_phrases DROP INDEX uk_vocab_phrase`)
  }

  const { phraseContentHash } = require('../utils/vocabHash')
  const rows = await db.all(
    `SELECT id, kind, phrase_en, content_hash FROM vocabulary_phrases WHERE content_hash IS NULL OR content_hash = ''`
  )
  for (const r of rows) {
    const hash = phraseContentHash(r.kind || 'phrase', r.phrase_en)
    await db.run(`UPDATE vocabulary_phrases SET content_hash = ? WHERE id = ?`, [hash, r.id])
  }

  if (!(await indexExists('vocabulary_phrases', 'uk_vocab_phrase_hash'))) {
    try {
      await db.exec(`ALTER TABLE vocabulary_phrases ADD UNIQUE KEY uk_vocab_phrase_hash (content_hash)`)
    } catch (e) {
      console.warn('vocabulary_phrases unique hash:', e.message)
    }
  }

  await seedPhrasesIfLow()
}

async function seedPhrasesIfLow() {
  const row = await db.get(`SELECT COUNT(*) AS c FROM vocabulary_phrases WHERE status = 1`)
  if (Number(row.c) >= 30) return
  const seedPath = path.join(__dirname, '..', '..', 'data', 'vocab-phrases-seed.json')
  if (!fs.existsSync(seedPath)) return
  const { importPhrasesFromFile } = require('../../scripts/import-vocab-lib')
  const result = await importPhrasesFromFile(seedPath, { silent: true })
  console.log(`Phrases seeded/merged: ${result.phrases} items`)
}

async function applyPermissionPatches() {
  if (!(await columnExists('users', 'perm_level'))) {
    await db.exec(
      `ALTER TABLE users ADD COLUMN perm_level TINYINT NOT NULL DEFAULT 0 COMMENT '权限等级，默认0' AFTER status`
    )
  }
  await ensurePermissionRequestsTable()
}

async function ensurePermissionRequestsTable() {
  if (await tableExists('permission_requests')) return
  await db.exec(`
    CREATE TABLE permission_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      request_level TINYINT NOT NULL COMMENT '申请权限等级',
      reason VARCHAR(500) NOT NULL DEFAULT '' COMMENT '申请原因',
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      admin_note VARCHAR(255) DEFAULT NULL COMMENT '审核备注',
      reviewed_by INT DEFAULT NULL,
      reviewed_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_perm_req_status (status, created_at),
      KEY idx_perm_req_user (user_id, status),
      CONSTRAINT fk_perm_req_user FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_perm_req_admin FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function applyUserProfilePatches() {
  const cols = [
    ['email', `ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL AFTER phone`],
    [
      'study_goal',
      `ALTER TABLE users ADD COLUMN study_goal VARCHAR(200) NOT NULL DEFAULT '' COMMENT '学习目标' AFTER email`
    ],
    [
      'motto',
      `ALTER TABLE users ADD COLUMN motto VARCHAR(200) NOT NULL DEFAULT '' COMMENT '个签座右铭' AFTER study_goal`
    ],
    [
      'email_notify_enabled',
      `ALTER TABLE users ADD COLUMN email_notify_enabled TINYINT(1) NOT NULL DEFAULT 0 AFTER motto`
    ],
    [
      'email_notify_mode',
      `ALTER TABLE users ADD COLUMN email_notify_mode ENUM('default', 'custom') NOT NULL DEFAULT 'default' AFTER email_notify_enabled`
    ],
    [
      'email_slot_morning',
      `ALTER TABLE users ADD COLUMN email_slot_morning TINYINT(1) NOT NULL DEFAULT 1 AFTER email_notify_mode`
    ],
    [
      'email_slot_afternoon',
      `ALTER TABLE users ADD COLUMN email_slot_afternoon TINYINT(1) NOT NULL DEFAULT 1 AFTER email_slot_morning`
    ],
    [
      'email_slot_evening',
      `ALTER TABLE users ADD COLUMN email_slot_evening TINYINT(1) NOT NULL DEFAULT 1 AFTER email_slot_afternoon`
    ],
    [
      'email_notify_when_done',
      `ALTER TABLE users ADD COLUMN email_notify_when_done TINYINT(1) NOT NULL DEFAULT 0 AFTER email_slot_evening`
    ]
  ]
  for (const [name, sql] of cols) {
    if (!(await columnExists('users', name))) {
      await db.exec(sql)
    }
  }
}

async function ensureEmailNotifyLogsTable() {
  if (await tableExists('email_notify_logs')) return
  await db.exec(`
    CREATE TABLE email_notify_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      slot ENUM('morning', 'afternoon', 'evening') NOT NULL,
      kind ENUM('remind', 'encourage') NOT NULL DEFAULT 'remind',
      status ENUM('ok', 'fail') NOT NULL,
      err_msg VARCHAR(255) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_email_logs_user (user_id, created_at),
      CONSTRAINT fk_email_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function tableExists(table) {
  const row = await db.get(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [config.mysql.database, table]
  )
  return Number(row.c) > 0
}

async function ensureEncouragementTable() {
  if (!(await tableExists('encouragement_messages'))) {
    await db.exec(`
      CREATE TABLE encouragement_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        content VARCHAR(500) NOT NULL,
        status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_encouragement_status (status, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)
  }

  const countRow = await db.get(`SELECT COUNT(*) AS c FROM encouragement_messages`)
  if (Number(countRow.c) === 0) {
    const defaults = [
      '每一天的努力，都在为梦想蓄力。',
      '考研路上不孤单，坚持就是最好的答案。',
      '慢一点没关系，别停下来就好。',
      '今天的你，比昨天更接近目标。',
      '认真备考的每一分钟，都算数。'
    ]
    for (let i = 0; i < defaults.length; i++) {
      await db.run(
        `INSERT INTO encouragement_messages (content, status, sort_order) VALUES (?, 'active', ?)`,
        [defaults[i], i]
      )
    }
  }
}

if (require.main === module) {
  migrate()
    .then(() => db.close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err.message)
      process.exit(1)
    })
}

module.exports = migrate
