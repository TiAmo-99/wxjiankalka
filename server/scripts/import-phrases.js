/**
 * 导入英语语料（短语 / 长句 / 阅读片段）
 * npm run db:import-phrases
 * npm run db:import-phrases -- path/to/custom.json
 */
const path = require('path')
const migrate = require('../src/db/migrate')
const db = require('../src/db/client')
const { importPhrasesFromFile } = require('./import-vocab-lib')

const defaultFile = path.join(__dirname, '..', 'data', 'vocab-phrases-seed.json')

async function main() {
  const file = process.argv[2] || defaultFile
  await migrate()
  await importPhrasesFromFile(file)
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err)
    process.exit(1)
  })
