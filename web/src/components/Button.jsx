import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useReducedMotion } from './hooks.js'

const VARIANTS = {
  primary: 'bg-amber text-[#1b1304] font-semibold hover:bg-amber-soft shadow-[0_0_0_1px_rgba(245,165,36,0.4),0_8px_30px_-8px_rgba(245,165,36,0.55)]',
  ghost: 'border border-ink-600 text-bone hover:bg-ink-700 hover:border-ink-500',
  quiet: 'text-bone-dim hover:text-bone hover:bg-ink-700/70',
  danger: 'border border-bad/50 text-bad hover:bg-bad/10',
}
const SIZES = { md: 'px-4 py-2.5 text-[0.92rem]', sm: 'px-3 py-1.5 text-[0.82rem]', lg: 'px-5 py-3 text-base' }

/** Button that leans toward the cursor (magnetic). */
export default function Button({ variant = 'primary', size = 'md', magnetic = true, className = '', disabled, children, ...props }) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 })
  const active = magnetic && !reduced && !disabled

  const onMove = (e) => {
    if (!active) return
    const r = e.currentTarget.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    x.set(Math.max(-9, Math.min(9, dx * 0.22)))
    y.set(Math.max(-7, Math.min(7, dy * 0.28)))
  }
  const reset = () => {
    x.set(0)
    y.set(0)
  }
  return (
    <motion.button
      type="button"
      disabled={disabled}
      style={{ x: sx, y: sy }}
      onPointerMove={onMove}
      onPointerLeave={reset}
      whileTap={active ? { scale: 0.97 } : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}
