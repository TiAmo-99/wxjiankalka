export function formatCalcDisplay(value) {
  if (value === null || value === undefined || value === '') return '0'
  const n = Number(value)
  if (!Number.isFinite(n)) return '错误'
  const fixed = Math.round(n * 1e10) / 1e10
  const str = String(fixed)
  if (str.length <= 14) return str
  return fixed.toExponential(6)
}

export function applyBinary(a, b, op) {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '*':
      return a * b
    case '/':
      if (b === 0) throw new Error('除数不能为 0')
      return a / b
    default:
      return b
  }
}
