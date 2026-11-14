const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }
export const Check = (p) => <svg {...base} {...p}><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>
export const Warn = (p) => <svg {...base} {...p}><path d="M8 2.5l6 10.5H2z" /><path d="M8 6.8v2.9M8 11.5v.1" /></svg>
export const Cross = (p) => <svg {...base} {...p}><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
export const Chevron = (p) => <svg {...base} {...p}><path d="M4 6l4 4 4-4" /></svg>
export const Spark = (p) => <svg {...base} {...p}><path d="M8 1.5l1.5 4.6 4.7 1.4-4.7 1.4L8 13.5 6.5 8.9 1.8 7.5l4.7-1.4z" /></svg>
export const Clock = (p) => <svg {...base} {...p}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.4 1.6" /></svg>
export const Play = (p) => <svg {...base} {...p}><path d="M5 3.5v9l7.5-4.5z" fill="currentColor" /></svg>
export const Copy = (p) => <svg {...base} {...p}><rect x="5.5" y="5.5" width="8" height="8" rx="1.8" /><path d="M10.5 5.5v-1.2A1.8 1.8 0 008.7 2.5H4.3a1.8 1.8 0 00-1.8 1.8v4.4a1.8 1.8 0 001.8 1.8h1.2" /></svg>
export const Table = (p) => <svg {...base} {...p}><rect x="2" y="3" width="12" height="10" rx="1.6" /><path d="M2 6.5h12M6 6.5V13" /></svg>
export const Logo = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="10" fill="none" stroke="#323843" strokeWidth="3.4" />
    <path d="M16 6a10 10 0 0 1 9.2 6" fill="none" stroke="#f5a524" strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="16" cy="16" r="2.8" fill="#f5a524" />
  </svg>
)
const STATUS = {
  pass: { Icon: Check, cls: 'text-ok bg-ok/12 ring-ok/35', word: 'Pass' },
  warn: { Icon: Warn, cls: 'text-warn bg-warn/12 ring-warn/35', word: 'Warn' },
  fail: { Icon: Cross, cls: 'text-bad bg-bad/12 ring-bad/40', word: 'Fail' },
}
export function StatusBadge({ status, className = '' }) {
  const { Icon, cls, word } = STATUS[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ring-1 ring-inset ${cls} ${className}`}>
      <Icon width={12} height={12} />
      {word}
    </span>
  )
}
export const Avatar = ({ person, size = 28 }) => (
  <span
    className="inline-grid shrink-0 place-items-center rounded-full font-semibold text-[#14110a]"
    style={{ width: size, height: size, background: person.tone, fontSize: size * 0.4 }}
    aria-hidden="true"
  >
    {person.name.split(' ').map((s) => s[0]).join('')}
  </span>
)
