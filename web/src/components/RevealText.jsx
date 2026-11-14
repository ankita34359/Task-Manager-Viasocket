import { motion } from 'framer-motion'
import { useReducedMotion } from './hooks.js'

/** Headline whose words rise into place. Wrap words in *asterisks* for the amber accent. */
export default function RevealText({ text, as: Tag = 'h1', className = '', delay = 0 }) {
  const reduced = useReducedMotion()
  const tokens = text.split(/\s+/).map((w) => ({ w: w.replace(/\*/g, ''), accent: /^\*.*\*$/.test(w) || w.startsWith('*') || w.endsWith('*') }))
  const plain = text.replace(/\*/g, '')
  return (
    <Tag className={className} aria-label={plain}>
      {tokens.map((t, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.14em] -mb-[0.14em] align-bottom">
          <motion.span
            className={`inline-block ${t.accent ? 'text-amber' : ''}`}
            initial={reduced ? false : { y: '115%', rotate: 3 }}
            animate={{ y: 0, rotate: 0 }}
            transition={{ delay: delay + i * 0.055, duration: 0.7, ease: [0.2, 0.75, 0.2, 1] }}
          >
            {t.w}
          </motion.span>
          {i < tokens.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
