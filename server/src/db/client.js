const mysql = require('mysql2/promise')
const config = require('../config')

let pool

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      timezone: '+08:00',
      charset: 'utf8mb4'
    })
  }
  return pool
}

async function get(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows[0] || null
}

async function all(sql, params = []) {
  const [rows] = await getPool().execute(sql, params)
  return rows
}

async function run(sql, params = []) {
  const [result] = await getPool().execute(sql, params)
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows,
    lastInsertRowid: result.insertId
  }
}

async function exec(sql) {
  const conn = await getPool().getConnection()
  try {
    await conn.query(sql)
  } finally {
    conn.release()
  }
}

async function transaction(fn) {
  const conn = await getPool().getConnection()
  await conn.beginTransaction()
  try {
    const tx = {
      async get(sql, params = []) {
        const [rows] = await conn.execute(sql, params)
        return rows[0] || null
      },
      async all(sql, params = []) {
        const [rows] = await conn.execute(sql, params)
        return rows
      },
      async run(sql, params = []) {
        const [result] = await conn.execute(sql, params)
        return { insertId: result.insertId, lastInsertRowid: result.insertId }
      }
    }
    const out = await fn(tx)
    await conn.commit()
    return out
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

async function ping() {
  await getPool().query('SELECT 1')
}

async function tableExists(name) {
  const row = await get(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = ? AND table_name = ?`,
    [config.mysql.database, name]
  )
  return Number(row.c) > 0
}

async function close() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

module.exports = { get, all, run, exec, transaction, ping, tableExists, close, getPool }
