/**
 * 重置管理员密码（不删学员数据）
 * 用法：node src/db/reset-admin.js
 *       node src/db/reset-admin.js 你的新密码
 */
const bcrypt = require('bcryptjs')
const config = require('../config')
const db = require('./client')

async function main() {
  const password = process.argv[2] || config.seedAdminPassword
  const username = config.seedAdminUsername || 'admin'

  if (!password) {
    console.error('请在 .env 设置 SEED_ADMIN_PASSWORD，或：node src/db/reset-admin.js 新密码')
    process.exit(1)
  }

  const hash = bcrypt.hashSync(password, 10)
  const existing = await db.get(
    `SELECT id FROM users WHERE username = ? AND role = 'admin'`,
    [username]
  )

  if (existing) {
    await db.run(
      `UPDATE users SET password_hash = ?, status = 'active', nickname = COALESCE(NULLIF(nickname, ''), '管理员') WHERE id = ?`,
      [hash, existing.id]
    )
    console.log(`已更新管理员「${username}」的密码`)
  } else {
    await db.run(
      `INSERT INTO users (nickname, username, password_hash, role, status)
       VALUES (?, ?, ?, 'admin', 'active')`,
      ['管理员', username, hash]
    )
    console.log(`已创建管理员「${username}」`)
  }

  console.log(`请使用以下凭据登录 /admin/#/login：`)
  console.log(`  账号：${username}`)
  console.log(`  密码：${password}`)
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('reset-admin failed:', err.message)
    process.exit(1)
  })
