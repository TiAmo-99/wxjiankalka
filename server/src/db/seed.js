const bcrypt = require('bcryptjs')
const config = require('../config')
const { todayStr, weekRange } = require('../utils/dates')
const migrate = require('./migrate')
const db = require('./client')

async function seed() {
  await migrate()

  const adminHash = bcrypt.hashSync(config.seedAdminPassword, 10)

  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM study_reports')
    await tx.run('DELETE FROM plan_items')
    await tx.run('DELETE FROM study_plans')
    await tx.run('DELETE FROM users')

    const admin = await tx.run(
      `INSERT INTO users (nickname, username, password_hash, role, status)
       VALUES (?, ?, ?, 'admin', 'active')`,
      ['管理员', config.seedAdminUsername, adminHash]
    )

    const student = await tx.run(
      `INSERT INTO users (openid, nickname, role, status)
       VALUES (?, ?, 'student', 'active')`,
      [config.devOpenid, '演示学员']
    )

    const { start, end } = weekRange()
    const plan = await tx.run(
      `INSERT INTO study_plans (user_id, title, start_date, end_date, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [student.insertId, '考研冲刺计划', start, end, admin.insertId]
    )

    const planId = plan.insertId
    const [y, m, d0] = start.split('-').map(Number)
    const mon = new Date(y, m - 1, d0)

    const items = [
      [0, '政治', '复习马原第一章', 60],
      [1, '英语', '精读一篇文章', 45],
      [2, '数学', '高数习题 Ch.2', 90],
      [3, '政治', '复习马原第一章', 60],
      [4, '英语', '背诵单词 Unit 5', 45],
      [5, '专业课', '真题阅读一篇', 40],
      [6, '数学', '线代总结', 50]
    ]

    const today = todayStr()
    for (const [offset, subject, content, minutes] of items) {
      const dt = new Date(mon)
      dt.setDate(mon.getDate() + offset)
      const date = `${dt.getFullYear()}-${`${dt.getMonth() + 1}`.padStart(2, '0')}-${`${dt.getDate()}`.padStart(2, '0')}`
      await tx.run(
        `INSERT INTO plan_items (plan_id, date, subject, content, target_minutes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [planId, date, subject, content, minutes, offset]
      )
    }

    await tx.run(
      `INSERT INTO plan_items (plan_id, date, subject, content, target_minutes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [planId, today, '政治', '复习马原第一章（今日）', 60, 100]
    )
    await tx.run(
      `INSERT INTO plan_items (plan_id, date, subject, content, target_minutes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [planId, today, '英语', '背诵单词 Unit 5（今日）', 45, 101]
    )

    const todayItems = await tx.all(
      `SELECT id, subject FROM plan_items WHERE plan_id = ? AND date = ? ORDER BY sort_order`,
      [planId, today]
    )

    const english = todayItems.find((r) => r.subject.includes('英语'))
    if (english) {
      await tx.run(
        `INSERT INTO study_reports (user_id, plan_item_id, report_date, completed, actual_minutes, start_time, end_time, note)
         VALUES (?, ?, ?, 1, 50, '09:00', '09:50', '已完成单词打卡')`,
        [student.insertId, english.id, today]
      )
    }
  })

  console.log('Seed OK')
  console.log('  Admin:', config.seedAdminUsername, '/', config.seedAdminPassword)
  console.log('  Student openid (dev):', config.devOpenid)
}

if (require.main === module) {
  seed()
    .then(() => db.close())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err.message)
      process.exit(1)
    })
}

module.exports = seed
