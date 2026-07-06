const express = require('express')
const cors = require('cors')
const apiRoutes = require('./routes')
const { fail } = require('./utils/response')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/v1', apiRoutes)

app.get('/', (_req, res) => {
  res.json({
    service: 'jiankalka-server',
    api: '/api/v1',
    health: '/api/v1/health'
  })
})

app.use((req, res) => {
  fail(res, 40400, '接口不存在', 404)
})

app.use((err, req, res, next) => {
  console.error(err)
  fail(res, 50000, '服务器错误', 500)
})

module.exports = app
