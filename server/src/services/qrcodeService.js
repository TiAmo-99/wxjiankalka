const QRCode = require('qrcode')

const MAX_TEXT_LEN = 500
const DEFAULT_SIZE = 280
const MIN_SIZE = 120
const MAX_SIZE = 512

/**
 * 生成 PNG 二维码，返回 base64 与 dataUrl
 */
async function generatePng(text, size = DEFAULT_SIZE) {
  const content = String(text || '').trim()
  if (!content) {
    const err = new Error('内容不能为空')
    err.code = 10001
    throw err
  }
  if (content.length > MAX_TEXT_LEN) {
    const err = new Error(`内容不能超过 ${MAX_TEXT_LEN} 字`)
    err.code = 10001
    throw err
  }

  let width = Number(size)
  if (!Number.isFinite(width)) width = DEFAULT_SIZE
  width = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(width)))

  let buffer
  try {
    buffer = await QRCode.toBuffer(content, {
      type: 'png',
      width,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: '#111827', light: '#ffffff' }
    })
  } catch (e) {
    const msg = e?.message || ''
    if (/too long|overflow|capacity/i.test(msg)) {
      const err = new Error('内容过长，无法生成二维码（请缩短文字）')
      err.code = 10001
      throw err
    }
    throw e
  }

  const imageBase64 = buffer.toString('base64')
  return {
    imageBase64,
    mimeType: 'image/png',
    dataUrl: `data:image/png;base64,${imageBase64}`,
    width,
    height: width
  }
}

module.exports = { generatePng, MAX_TEXT_LEN }
