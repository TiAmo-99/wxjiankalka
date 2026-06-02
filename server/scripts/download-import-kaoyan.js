/**
 * 从 KyleBing/english-vocabulary 下载考研乱序词表并导入数据库
 *
 * 用法: npm run db:import-vocab:kaoyan
 */
const fs = require('fs')
const https = require('https')
const path = require('path')
const migrate = require('../src/db/migrate')
const db = require('../src/db/client')
const { importVocabFromFile } = require('./import-vocab-lib')

const KAOYAN_TXT_URL =
  'https://raw.githubusercontent.com/KyleBing/english-vocabulary/master/5%20%E8%80%83%E7%A0%94-%E4%B9%B1%E5%BA%8F.txt'
const outFile = path.join(__dirname, '..', 'data', 'kaoyan-kylebing.txt')

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close()
          fs.unlinkSync(dest)
          return download(res.headers.location, dest).then(resolve).catch(reject)
        }
        if (res.statusCode !== 200) {
          file.close()
          fs.unlinkSync(dest)
          reject(new Error(`下载失败 HTTP ${res.statusCode}`))
          return
        }
        res.pipe(file)
        file.on('finish', () => file.close(resolve))
      })
      .on('error', (err) => {
        file.close()
        if (fs.existsSync(dest)) fs.unlinkSync(dest)
        reject(err)
      })
  })
}

async function main() {
  console.log('Downloading kaoyan vocabulary...')
  await download(KAOYAN_TXT_URL, outFile)
  console.log('Saved:', outFile)

  await migrate()
  const result = await importVocabFromFile(outFile, { tags: 'kaoyan' })
  console.log(`Done: ${result.words} words imported`)
}

main()
  .then(() => db.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message || err)
    process.exit(1)
  })
