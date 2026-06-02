/**
 * 批量导入考研词汇 JSON
 *
 * 用法:
 *   npm run db:import-vocab
 *   npm run db:import-vocab -- path/to/考研.json
 *
 * 支持格式:
 *   .json — { "words": [...], "phrases": [...] } 或 KyleBing 数组
 *   .txt  — 每行「单词<Tab>释义」（KyleBing 乱序词表）
 *
 * 一键导入考研约 9600 词:
 *   npm run db:import-vocab:kaoyan
 */
const path = require('path')
const migrate = require('../src/db/migrate')
const db = require('../src/db/client')
const { importVocabFromFile } = require('./import-vocab-lib')

const defaultFile = path.join(__dirname, '..', 'data', 'vocab-kaoyan-seed.json')

async function main() {
  const file = process.argv[2] || defaultFile
  await migrate()
  await importVocabFromFile(file)
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err)
    process.exit(1)
  })
