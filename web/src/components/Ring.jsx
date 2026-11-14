import { useId } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from './hooks.js'

/** A ring that draws itself to value/max. Children render in the centre. */
export default function Ring({ value, max = 100, size = 120, stroke = 9, delay = 0, tone = 'amber', children, className = '' }) {
  const reduced = useReducedMotion()
  const id = useId()
  const pct = Math.max(0, Math.min(1, max ? value / max : 0))
  const r = (size - stroke) / 2
  const c = size / 2
  const stops = tone === 'ok' ? ['#86c49a', '#bfe0c8'] : tone === 'bad' ? ['#e5694f', '#f0a08b'] : ['#d98a12', '#fbc65d']
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={stops[0]} />
            <stop offset="1" stopColor={stops[1]} />
          </linearGradient>
        </defs>
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle cx={c} cy={c} r={r} fill="none" stroke="#252932" strokeWidth={stroke} />
          <motion.circle
            cx={c} cy={c} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: pct }}
            transition={{ duration: 1.3, delay, ease: [0.2, 0.7, 0.2, 1] }}
          />
        </g>
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  )
}
