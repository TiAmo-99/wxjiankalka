/** 延迟加载，兼容微信小程序 CommonJS 构建 */
let qrcodeLib = null

function getQrcodeLib() {
  if (qrcodeLib) return qrcodeLib
  try {
    // uni-app 微信小程序端 require 可用
    // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-require-imports
    const mod = require('./qrcode-generator.js')
    if (typeof mod === 'function') {
      qrcodeLib = mod
      return qrcodeLib
    }
    if (mod && typeof mod.default === 'function') {
      qrcodeLib = mod.default
      return qrcodeLib
    }
  } catch (e) {
    console.warn('[qr-canvas] require qrcode-generator failed', e)
  }
  throw new Error('二维码库加载失败，请重新编译小程序')
}

function createQr(text) {
  const qrcode = getQrcodeLib()
  const content = String(text || '').trim()
  if (!content) {
    throw new Error('内容不能为空')
  }

  const qr = qrcode(0, 'L')
  qr.addData(content, 'Byte')

  try {
    qr.make()
  } catch (e) {
    const msg = typeof e === 'string' ? e : e?.message || ''
    if (msg.includes('overflow') || msg.includes('length')) {
      throw new Error('内容过长，无法生成二维码（请缩短文字）')
    }
    throw new Error('二维码生成失败，请稍后重试')
  }

  if (!qr.getModuleCount || qr.getModuleCount() < 1) {
    throw new Error('二维码生成失败')
  }
  return qr
}

/**
 * 在 canvas 上绘制二维码（uni-app 旧版 canvas API）
 */
export function drawQrToCanvas(canvasId, text, sizePx = 280) {
  const qr = createQr(text)
  const count = qr.getModuleCount()
  const size = sizePx
  const margin = Math.round(size * 0.08)
  const tile = (size - margin * 2) / count
  const ctx = uni.createCanvasContext(canvasId)

  ctx.setFillStyle('#ffffff')
  ctx.fillRect(0, 0, size, size)

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      ctx.setFillStyle(qr.isDark(row, col) ? '#111827' : '#ffffff')
      const x = margin + col * tile
      const y = margin + row * tile
      ctx.fillRect(x, y, Math.ceil(tile), Math.ceil(tile))
    }
  }

  return new Promise((resolve) => {
    ctx.draw(false, () => {
      setTimeout(resolve, 200)
    })
  })
}

export function canvasToImage(canvasId) {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvasId,
      fileType: 'png',
      quality: 1,
      success: (res) => resolve(res.tempFilePath),
      fail: (err) => reject(new Error(err.errMsg || '导出图片失败'))
    })
  })
}
