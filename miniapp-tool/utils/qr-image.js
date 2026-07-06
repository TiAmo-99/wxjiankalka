/**
 * 将 base64 PNG 写入本地临时文件，供 image / saveImageToPhotosAlbum 使用
 * （微信小程序不支持 data: URL 作为 image src）
 */
export function writeBase64PngToTempFile(base64) {
  return new Promise((resolve, reject) => {
    if (!base64) {
      reject(new Error('图片数据为空'))
      return
    }

    const fs = uni.getFileSystemManager()
    const name = `qr_${Date.now()}.png`
    let filePath = name

    // #ifdef MP-WEIXIN
    filePath = `${wx.env.USER_DATA_PATH}/${name}`
    // #endif
    // #ifdef APP-PLUS
    filePath = `_doc/${name}`
    // #endif

    fs.writeFile({
      filePath,
      data: base64,
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: (err) => reject(new Error(err?.errMsg || '写入图片失败'))
    })
  })
}

/**
 * 优先写临时文件；H5 等环境回退 dataUrl
 */
export async function resolveQrImageSrc({ imageBase64, dataUrl }) {
  if (!imageBase64 && !dataUrl) {
    throw new Error('未返回图片数据')
  }

  // #ifdef H5
  if (dataUrl) return dataUrl
  if (imageBase64) return `data:image/png;base64,${imageBase64}`
  // #endif

  try {
    return await writeBase64PngToTempFile(imageBase64)
  } catch (e) {
    if (dataUrl) return dataUrl
    throw e
  }
}
