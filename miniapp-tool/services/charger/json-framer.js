/**
 * BLE Notify JSON 组帧器（字节缓冲 + 括号平衡法）
 * 先累积 ArrayBuffer，整段 UTF-8 解码后再 JSON.parse，避免中文 decs 乱码。
 */

const BUFFER_TIMEOUT_MS = 10000

/** 与 ble-transport ab2str 一致 */
export function bytesToUtf8(buffer) {
  if (!buffer) return ''
  try {
    const arr = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    let s = ''
    const chunk = 0x8000
    for (let i = 0; i < arr.length; i += chunk) {
      s += String.fromCharCode.apply(null, arr.subarray(i, i + chunk))
    }
    return decodeURIComponent(escape(s))
  } catch (_) {
    return ''
  }
}

function toUint8Array(chunk) {
  if (!chunk) return new Uint8Array(0)
  if (chunk instanceof Uint8Array) return chunk
  if (chunk instanceof ArrayBuffer) return new Uint8Array(chunk)
  return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length)
  out.set(a, 0)
  out.set(b, a.length)
  return out
}

function charLenToByteLen(text, charLen) {
  if (!text || charLen <= 0) return 0
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text.slice(0, charLen)).length
  }
  return charLen
}

export function extractJsonObject(text) {
  if (!text) return null

  const start = text.indexOf('{')
  if (start < 0) return { obj: null, consumed: text.length }

  let depth = 0
  let inStr = false
  let esc = false
  let end = -1

  for (let j = start; j < text.length; j++) {
    const ch = text[j]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') {
      inStr = true
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        end = j
        break
      }
    }
  }

  if (end < 0) return null

  const slice = text.slice(start, end + 1)
  const consumed = end + 1

  try {
    const obj = JSON.parse(slice)
    if (obj && typeof obj === 'object') {
      return { obj, consumed }
    }
  } catch (_) {
    /* parse failed */
  }

  return { obj: null, consumed }
}

export function createJsonFramer(onMessage, hooks = {}) {
  const { onWarn } = hooks
  let rxBytes = new Uint8Array(0)
  let timer = null

  function warn(msg) {
    if (typeof onWarn === 'function') onWarn(msg)
  }

  function resetTimer() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      if (rxBytes.length) {
        warn(`组帧缓冲超时清空 (${rxBytes.length}B)`)
        rxBytes = new Uint8Array(0)
      }
      timer = null
    }, BUFFER_TIMEOUT_MS)
  }

  function emitObject(obj) {
    if (obj && typeof onMessage === 'function') onMessage(obj)
  }

  function drain() {
    while (rxBytes.length) {
      const text = bytesToUtf8(rxBytes)
      if (!text) break

      const lead = text.match(/^[\s\r\n]+/)
      let offset = 0
      if (lead) {
        offset = lead[0].length
        if (offset >= text.length) {
          rxBytes = new Uint8Array(0)
          break
        }
      }

      const slice = text.slice(offset)
      if (slice[0] !== '{') {
        const next = slice.indexOf('{')
        if (next < 0) {
          const drop = charLenToByteLen(text, offset + slice.length)
          rxBytes = rxBytes.slice(drop)
          break
        }
        const drop = charLenToByteLen(text, offset + next)
        rxBytes = rxBytes.slice(drop)
        continue
      }

      const result = extractJsonObject(slice)
      if (!result) break

      const drop = charLenToByteLen(text, offset + result.consumed)
      if (drop <= 0) break
      rxBytes = rxBytes.slice(drop)

      if (result.obj) {
        emitObject(result.obj)
      } else if (result.consumed > 0) {
        warn(`跳过无效 JSON 片段 ${result.consumed} 字符`)
      }
    }
  }

  function feed(chunk) {
    const arr = toUint8Array(chunk)
    if (!arr.length) return
    rxBytes = concatBytes(rxBytes, arr)
    resetTimer()
    drain()
  }

  function flush() {
    drain()
    rxBytes = new Uint8Array(0)
    if (timer) clearTimeout(timer)
    timer = null
  }

  function destroy() {
    flush()
  }

  return {
    feed,
    flush,
    destroy,
    getBufferLength: () => rxBytes.length
  }
}
