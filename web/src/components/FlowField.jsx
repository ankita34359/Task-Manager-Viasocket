import { useEffect, useRef } from 'react'
import { useReducedMotion } from './hooks.js'
import { fx } from '../lib/fx.js'

// Background flow field. Fine strokes follow a smooth vector field, bend
// around the cursor, and ripple outward when fx.pulse() is called.
const BG = '11,12,14'

function angleAt(x, y, t) {
  return (
    (Math.sin(x * 0.0042 + t * 0.00011) + Math.cos(y * 0.0051 - t * 0.00008) + Math.sin((x + y) * 0.0027 + t * 0.00006)) *
    Math.PI * 0.62
  )
}

export default function FlowField() {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let w = 0, h = 0, dpr = 1, raf = 0, last = 0
    let parts = []
    const mouse = { x: -9999, y: -9999, on: false }
    const pulses = []

    const spawn = (p = {}) => {
      p.x = Math.random() * w
      p.y = Math.random() * h
      p.px = p.x
      p.py = p.y
      p.age = 0
      p.life = 120 + Math.random() * 260
      p.amber = Math.random() < 0.24
      p.speed = 0.6 + Math.random() * 0.9
      return p
    }

    const resize = () => {
      w = window.innerWidth
      h = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = `rgb(${BG})`
      ctx.fillRect(0, 0, w, h)
      const n = Math.max(70, Math.min(190, Math.round((w * h) / 9500)))
      parts = Array.from({ length: n }, () => spawn())
      if (reduced) drawStill()
    }

    // A single calm frame: long streamlines traced once, no animation.
    const drawStill = () => {
      ctx.fillStyle = `rgb(${BG})`
      ctx.fillRect(0, 0, w, h)
      const seeds = Math.round((w * h) / 5200)
      for (let i = 0; i < seeds; i++) {
        let x = Math.random() * w
        let y = Math.random() * h
        const amber = Math.random() < 0.2
        ctx.strokeStyle = amber ? 'rgba(245,165,36,0.22)' : 'rgba(236,230,218,0.09)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, y)
        for (let s = 0; s < 36; s++) {
          const a = angleAt(x, y, 0)
          x += Math.cos(a) * 4
          y += Math.sin(a) * 4
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }

    const frame = (time) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(48, time - (last || time))
      last = time
      const k = dt / 16.7
      ctx.fillStyle = `rgba(${BG},0.07)`
      ctx.fillRect(0, 0, w, h)

      for (const p of parts) {
        let a = angleAt(p.x, p.y, time)
        let vx = Math.cos(a) * p.speed
        let vy = Math.sin(a) * p.speed

        if (mouse.on) {
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const d = Math.hypot(dx, dy)
          const R = 230
          if (d < R && d > 1) {
            const f = 1 - d / R
            // swirl around the cursor, with a gentle push away
            vx += (-dy / d) * f * 2.6 + (dx / d) * f * 0.9
            vy += (dx / d) * f * 2.6 + (dy / d) * f * 0.9
          }
        }
        for (const pu of pulses) {
          const r = Math.max(0, time - pu.t0) * 0.55
          const dx = p.x - pu.x
          const dy = p.y - pu.y
          const d = Math.hypot(dx, dy) || 1
          const edge = Math.abs(d - r)
          if (edge < 70) {
            const f = (1 - edge / 70) * pu.power
            vx += (dx / d) * f * 6
            vy += (dy / d) * f * 6
          }
        }

        p.px = p.x
        p.py = p.y
        p.x += vx * k
        p.y += vy * k
        p.age += k
        const fade = Math.min(1, p.age / 20, (p.life - p.age) / 30)
        ctx.strokeStyle = p.amber ? `rgba(245,165,36,${0.7 * Math.max(0, fade)})` : `rgba(236,230,218,${0.3 * Math.max(0, fade)})`
        ctx.lineWidth = p.amber ? 1.15 : 0.9
        ctx.beginPath()
        ctx.moveTo(p.px, p.py)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
        if (p.age > p.life || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) spawn(p)
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i]
        const life = Math.max(0, time - pu.t0)
        if (life > 1700) {
          pulses.splice(i, 1)
          continue
        }
        const o = (1 - life / 1700) * 0.55 * pu.power
        ctx.strokeStyle = `rgba(245,165,36,${o})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(pu.x, pu.y, life * 0.55, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    const move = (e) => {
      mouse.x = e.clientX
      mouse.y = e.clientY
      mouse.on = true
    }
    const leave = () => (mouse.on = false)

    resize()
    window.addEventListener('resize', resize)
    let offs = []
    if (!reduced) {
      window.addEventListener('pointermove', move, { passive: true })
      document.addEventListener('pointerleave', leave)
      window.addEventListener('blur', leave)
      offs.push(fx.on('pulse', (p) => pulses.push({ x: p.x, y: p.y, t0: performance.now(), power: p.power ?? 1 })))
      raf = requestAnimationFrame(frame)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      window.removeEventListener('blur', leave)
      offs.forEach((o) => o())
    }
  }, [reduced])

  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="fixed inset-0 z-0 h-full w-full" data-testid="flow-field" />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, transparent 0%, rgba(11,12,14,0.55) 70%, rgba(11,12,14,0.9) 100%)' }}
      />
    </>
  )
}
