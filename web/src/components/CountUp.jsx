import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'
import { useReducedMotion } from './hooks.js'

/** Number that counts from its previous value to the new one. */
export default function CountUp({ value, decimals = 0, duration = 1.1, prefix = '', suffix = '', className = '' }) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const shown = useRef(reduced ? value : 0)
  const fmt = (v) => `${prefix}${v.toFixed(decimals)}${suffix}`

  useEffect(() => {
    const el = ref.current
    if (reduced) {
      shown.current = value
      el.textContent = fmt(value)
      return
    }
    const controls = animate(shown.current, value, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => {
        shown.current = v
        el.textContent = fmt(v)
      },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced, duration, decimals, prefix, suffix])

  return (
    <span className={`num ${className}`}>
      <span ref={ref} aria-hidden="true">{fmt(shown.current)}</span>
      <span className="sr-only">{fmt(value)}</span>
    </span>
  )
}
