/**
 * BLE Notify JSON 组帧器（纯字节缓冲 + 括号平衡法）
 * JSON 结构字符均为 ASCII，在字节层组帧；完整包再 UTF-8 解码，避免中英文混排时缓冲错位。
 */

const BUFFER_TIMEOUT_MS = 15000
const WS = new Set([0x20, 0x09, 0x0a, 0x0d])

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

function skipWs(bytes, from = 0) {
  let i = from
  while (i < bytes.length && WS.has(bytes[i])) i++
  return i
}

function findByte(bytes, code, from = 0) {
  for (let i = from; i < bytes.length; i++) {
    if (bytes[i] === code) return i
  }
  return -1
}

/** 在 bytes[start] 为 { 时找匹配的 }，返回 end 索引；不足返回 -1 */
function findJsonEndBytes(bytes, start) {
  let depth = 0
  let inStr = false
  let esc = false

  for (let j = start; j < bytes.length; j++) {
    const b = bytes[j]
    if (esc) {
      esc = false
      continue
    }
    if (inStr) {
      if (b === 0x5c) esc = true
      else if (b === 0x22) inStr = false
      continue
    }
    if (b === 0x22) {
      inStr = true
      continue
    }
    if (b === 0x7b) depth++
    else if (b === 0x7d) {
      depth--
      if (depth === 0) return j
    }
  }
  return -1
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
      let i = skipWs(rxBytes, 0)
      if (i >= rxBytes.length) {
        rxBytes = new Uint8Array(0)
        break
      }
      if (i > 0) {
        rxBytes = rxBytes.slice(i)
        continue
      }

      if (rxBytes[0] !== 0x7b) {
        const next = findByte(rxBytes, 0x7b, 1)
        if (next < 0) {
          rxBytes = new Uint8Array(0)
          break
        }
        warn(`跳过 ${next} 字节至 '{'`)
        rxBytes = rxBytes.slice(next)
        continue
      }

      const end = findJsonEndBytes(rxBytes, 0)
      if (end < 0) break

      const packet = rxBytes.slice(0, end + 1)
      rxBytes = rxBytes.slice(end + 1)

      try {
        const text = bytesToUtf8(packet)
        const obj = JSON.parse(text)
        if (obj && typeof obj === 'object') emitObject(obj)
      } catch (_) {
        warn(`JSON 解析失败 (${packet.length}B)`)
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
