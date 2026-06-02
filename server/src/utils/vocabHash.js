const crypto = require('crypto')

function phraseContentHash(kind, phraseEn) {
  const k = String(kind || 'phrase').trim()
  const en = String(phraseEn || '').trim()
  return crypto.createHash('md5').update(`${k}:${en}`).digest('hex')
}

module.exports = { phraseContentHash }
