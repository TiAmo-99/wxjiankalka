/**
 * 固件文件选取
 * - 微信小程序：chooseFile（本机）/ chooseMessageFile（聊天记录）
 * - App：uni.chooseFile（本机）/ chooseMessageFile（若可用）
 */

import { isPrivacyNotDeclaredError } from '@/utils/wx-privacy.js'

const FIRMWARE_EXTENSIONS = ['.bin', '.hex', '.fw']
const FIRMWARE_EXT_NO_DOT = FIRMWARE_EXTENSIONS.map((e) => e.replace(/^\./, ''))

function readFileBuffer(filePath) {
  return new Promise((resolve, reject) => {
    const fs = uni.getFileSystemManager()
    fs.readFile({
      filePath,
      success: (res) => {
        const data = res.data
        if (data instanceof ArrayBuffer) {
          resolve(data)
          return
        }
        if (data && data.buffer) {
          resolve(data.buffer)
          return
        }
        reject(new Error('无法读取固件文件内容'))
      },
      fail: (err) => reject(new Error(err?.errMsg || '读取文件失败'))
    })
  })
}

function guessVersionFromName(name) {
  const base = String(name || '').replace(/\.[^.]+$/, '')
  const m = base.match(/v?(\d+(?:\.\d+)+)/i)
  return m ? m[1] : base || 'unknown'
}

async function packResult(tempFile) {
  const name = tempFile.name || 'firmware.bin'
  const buffer = await readFileBuffer(tempFile.path)
  if (!buffer || !buffer.byteLength) {
    throw new Error('固件文件为空')
  }
  return {
    name,
    size: buffer.byteLength,
    version: guessVersionFromName(name),
    path: tempFile.path,
    buffer
  }
}

function normalizePickError(err) {
  const msg = String(err?.errMsg || err?.message || err || '')
  if (msg.includes('cancel')) return new Error('已取消选择')
  if (isPrivacyNotDeclaredError(err) || msg.includes('api scope is not declared')) {
    return new Error(
      '选文件能力未在《用户隐私保护指引》中声明。请在微信公众平台勾选「选中的文件」并填写用途，保存生效后重新打开小程序再试。'
    )
  }
  return new Error(msg || '选择文件失败')
}

function invokeChooseMessageFile() {
  return new Promise((resolve, reject) => {
    uni.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: FIRMWARE_EXT_NO_DOT,
      success: async (res) => {
        try {
          const file = res.tempFiles?.[0]
          if (!file) {
            reject(new Error('未选择文件'))
            return
          }
          resolve(await packResult(file))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(normalizePickError(err))
    })
  })
}

function invokeChooseLocalFile() {
  return new Promise((resolve, reject) => {
    if (typeof uni.chooseFile !== 'function') {
      reject(new Error('当前微信版本过低，请升级微信后使用本机选文件'))
      return
    }
    uni.chooseFile({
      count: 1,
      type: 'file',
      extension: FIRMWARE_EXTENSIONS,
      success: async (res) => {
        try {
          const file = res.tempFiles?.[0]
          if (!file) {
            reject(new Error('未选择文件'))
            return
          }
          resolve(await packResult(file))
        } catch (e) {
          reject(e)
        }
      },
      fail: (err) => reject(normalizePickError(err))
    })
  })
}

/** 从微信聊天记录选择 */
export function pickFirmwareFromChat() {
  return invokeChooseMessageFile()
}

/** 从本机存储选择（微信小程序基础库 2.26+ 支持 chooseFile） */
export function pickFirmwareFromLocal() {
  return invokeChooseLocalFile()
}

export function formatFirmwareSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}
