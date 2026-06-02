const config = require('./config')
const app = require('./app')
const db = require('./db')
const seed = require('./db/seed')

async function bootstrap() {
  try {
    await db.ping()
    console.log('[db] MySQL 已连接:', config.mysql.database)
  } catch (e) {
    console.error('[db] MySQL 连接失败，请检查 .env 中 MYSQL_* 配置，并确认已在宝塔创建数据库')
    console.error('       ', e.message)
    process.exit(1)
  }

  const hasUsers = await db.tableExists('users')
  if (!hasUsers) {
    console.log('[init] 数据表不存在，正在迁移并写入种子数据…')
    await seed()
  }

  app.listen(config.port, () => {
    console.log(`考研学习记录 API: http://localhost:${config.port}/api/v1`)
    console.log(`健康检查: http://localhost:${config.port}/api/v1/health`)
    if (!config.wxAppId) {
      console.log('[dev] 未配置微信 AppID，使用开发 openid:', config.devOpenid)
    }
  })
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
