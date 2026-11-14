// Working-time helpers. Working hours are Mon-Fri, 09:00-18:00 local time.
export const WORK_START = 9
export const WORK_END = 18
const HOUR = 3600 * 1000

const atHour = (day, h) => {
  const d = new Date(day)
  d.setHours(h, 0, 0, 0)
  return d
}
const nextMidnight = (d) => {
  const n = new Date(d)
  n.setHours(24, 0, 0, 0)
  return n
}
export const isWorkday = (d) => d.getDay() >= 1 && d.getDay() <= 5

export function isWorkingTime(date) {
  const d = new Date(date)
  return isWorkday(d) && d.getHours() >= WORK_START && d.getHours() < WORK_END
}

/** Working hours between two instants (Mon-Fri 9-18). */
export function workingHoursBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  if (!(e > s)) return 0
  let total = 0
  let cursor = new Date(s)
  cursor.setHours(0, 0, 0, 0)
  for (let guard = 0; cursor < e && guard < 800; guard++) {
    if (isWorkday(cursor)) {
      const from = Math.max(s, atHour(cursor, WORK_START))
      const to = Math.min(e, atHour(cursor, WORK_END))
      if (to > from) total += (to - from) / HOUR
    }
    cursor = nextMidnight(cursor)
  }
  return total
}

/** The instant at which `hours` of working time have passed after `start`. */
export function addWorkingHours(start, hours) {
  let remaining = Math.max(0, hours)
  let cursor = new Date(start)
  for (let guard = 0; guard < 800; guard++) {
    if (isWorkday(cursor)) {
      const from = Math.max(cursor, atHour(cursor, WORK_START))
      const to = atHour(cursor, WORK_END)
      if (to > from) {
        const avail = (to - from) / HOUR
        if (remaining <= avail) return new Date(+from + remaining * HOUR)
        remaining -= avail
      }
    }
    cursor = nextMidnight(cursor)
  }
  return cursor
}

/** Parse "6.5 h", "18%", "$1,200" into { value, unit }. value is null if no number. */
export function parseQuantity(input) {
  const s = String(input ?? '').trim()
  const m = s.match(/-?\d[\d,]*(?:\.\d+)?|-?\.\d+/)
  if (!m) return { value: null, unit: s }
  const value = Number(m[0].replace(/,/g, ''))
  const unit = (s.slice(0, m.index) + s.slice(m.index + m[0].length)).trim()
  return { value: Number.isFinite(value) ? value : null, unit }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n) => String(n).padStart(2, '0')

export function fmtWhen(input) {
  const d = new Date(input)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export function fmtShortDate(input) {
  const d = new Date(input)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export const fmtHours = (h) => `${Math.round(h * 10) / 10}h`

/** value for <input type="datetime-local"> */
export function toLocalInput(input) {
  const d = new Date(input)
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`
}
export function fromLocalInput(value) {
  if (!value) return null
  const t = new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

/** "2h 14m 05s" / "1d 3h" / overdue variants. */
export function fmtCountdown(ms) {
  const over = ms < 0
  const abs = Math.abs(ms)
  const s = Math.floor(abs / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const body = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${p2(m)}m` : `${m}m ${p2(sec)}s`
  return { text: body, over }
}
