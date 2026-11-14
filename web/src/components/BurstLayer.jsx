import { useEffect, useRef } from 'react'
import { useReducedMotion } from './hooks.js'
import { fx } from '../lib/fx.js'

// Particle burst, drawn on a click-through canvas above the page.
const COLORS = ['#f5a524', '#fbc65d', '#f5a524', '#ece6da', '#ffffff', '#b97508']

export default function BurstLayer() {
  const ref = useRef(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let parts = []
    let raf = 0
    let w = 0, h = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      parts = parts.filter((p) => p.life > 0)
      for (const p of parts) {
        p.vx *= 0.985
        p.vy = p.vy * 0.985 + 0.18
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life -= 1
        ctx.save()
        ctx.globalAlpha = Math.min(1, p.life / 24)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        if (p.round) {
          ctx.beginPath()
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx.fill()
        } else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (parts.length) raf = requestAnimationFrame(tick)
      else {
        raf = 0
        ctx.clearRect(0, 0, w, h)
      }
    }
    const off = fx.on('burst', ({ x, y, count = 72 }) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 2 + Math.random() * 8
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          size: 4 + Math.random() * 7, round: Math.random() < 0.4,
          color: COLORS[(Math.random() * COLORS.length) | 0], life: 55 + Math.random() * 60,
        })
      }
      if (!raf) raf = requestAnimationFrame(tick)
    })
    resize()
    window.addEventListener('resize', resize)
    return () => {
      off()
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-full w-full" data-testid="burst-layer" />
}
