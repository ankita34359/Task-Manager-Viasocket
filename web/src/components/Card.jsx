import { useRef } from 'react'

/** Surface with a spotlight glow that follows the cursor. */
export default function Card({ as: Tag = 'div', className = '', children, ...props }) {
  const ref = useRef(null)
  const onMove = (e) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return (
    <Tag ref={ref} onPointerMove={onMove} className={`spot ${className}`} {...props}>
      {children}
    </Tag>
  )
}
