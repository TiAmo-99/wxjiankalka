const fs = require('fs')
const path = require('path')
const express = require('express')
const cors = require('cors')
const config = require('./config')
const apiRoutes = require('./routes')
const { fail } = require('./utils/response')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/v1', apiRoutes)

/** 管理后台：与 API 同域，访问 https://你的域名/admin/#/login */
function mountAdminStatic() {
  const dist = config.adminStaticPath
  const indexFile = path.join(dist, 'index.html')
  if (!fs.existsSync(indexFile)) {
    return
  }
  const sendIndex = (_req, res) => res.sendFile(indexFile)
  app.get(['/admin', '/admin/'], sendIndex)
  app.use(
    '/admin',
    express.static(dist, {
      maxAge: '1h',
      index: false,
      redirect: false
    })
  )
  console.log('[admin] static at /admin ->', dist)
}

mountAdminStatic()

app.get('/', (req, res) => {
  const adminIndex = path.join(config.adminStaticPath, 'index.html')
  if (fs.existsSync(adminIndex)) {
    return res.redirect(302, '/admin/')
  }
  return fail(res, 40400, '接口不存在', 404)
})

app.use((req, res) => {
  fail(res, 40400, '接口不存在', 404)
})

app.use((err, req, res, next) => {
  console.error(err)
  fail(res, 50000, '服务器错误', 500)
})

module.exports = app
