/**
 * 邮件学习提醒定时任务
 * 用法: node src/jobs/send-email-reminders.js morning|afternoon|evening
 *
 * crontab 示例（北京时间）:
 * 0 9 * * *  cd /path/to/server && node src/jobs/send-email-reminders.js morning
 * 0 14 * * * cd /path/to/server && node src/jobs/send-email-reminders.js afternoon
 * 0 21 * * * cd /path/to/server && node src/jobs/send-email-reminders.js evening
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../../.env') })

const db = require('../db/client')
const emailReminderService = require('../services/emailReminderService')

async function main() {
  const slot = process.argv[2]
  if (!slot) {
    console.error('请指定时段: morning | afternoon | evening')
    process.exit(1)
  }

  try {
    const result = await emailReminderService.runSlot(slot)
    console.log('[email-reminder]', JSON.stringify(result))
    process.exit(0)
  } catch (e) {
    console.error('[email-reminder] failed:', e.message)
    process.exit(1)
  } finally {
    await db.close()
  }
}

main()
