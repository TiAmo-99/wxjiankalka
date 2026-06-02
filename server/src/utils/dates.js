function pad(n) {
  return `${n}`.padStart(2, '0')
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function weekRange(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() || 7
  const mon = new Date(d)
  mon.setDate(d.getDate() - day + 1)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
  return { start: fmt(mon), end: fmt(sun) }
}

function isToday(dateStr) {
  return dateStr === todayStr()
}

module.exports = { todayStr, weekRange, isToday }
