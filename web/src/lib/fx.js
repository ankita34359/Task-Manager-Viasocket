// Tiny event bus so any component can trigger background pulses and particle bursts.
const bus = new EventTarget()
const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }))
const center = (el) => {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

export const fx = {
  /** Ripple through the flow field from a point (or an element's centre). */
  pulse(at) {
    const p = at instanceof Element ? center(at) : at ?? center(null)
    emit('pulse', p)
  },
  /** Particle burst from a point (or an element's centre). */
  burst(at, opts = {}) {
    const p = at instanceof Element ? center(at) : at ?? center(null)
    emit('burst', { ...p, ...opts })
  },
  on(type, fn) {
    const h = (e) => fn(e.detail)
    bus.addEventListener(type, h)
    return () => bus.removeEventListener(type, h)
  },
}
