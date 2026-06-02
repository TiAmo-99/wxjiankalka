/**
 * 防抖（leading）：间隔内仅触发第一次，适合提交按钮
 * @param {Function} fn
 * @param {number} wait ms
 */
export function debounceLeading(fn, wait = 500) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall < wait) return
    lastCall = now
    return fn.apply(this, args)
  }
}
