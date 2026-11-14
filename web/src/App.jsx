import { useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import FlowField from './components/FlowField.jsx'
import BurstLayer from './components/BurstLayer.jsx'
import { Logo } from './components/icons.jsx'
import { useReducedMotion } from './components/hooks.js'
import MyDay from './views/MyDay.jsx'
import Manager from './views/Manager.jsx'

const VIEWS = [
  { id: 'myday', label: 'My Day', Comp: MyDay },
  { id: 'manager', label: 'Manager View', Comp: Manager },
]

function ViewSwitch({ view, onChange }) {
  const refs = useRef([])
  const onKey = (e, i) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
    e.preventDefault()
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? VIEWS.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + VIEWS.length) % VIEWS.length
    onChange(VIEWS[n].id)
    refs.current[n]?.focus()
  }
  return (
    <LayoutGroup id="view-switch">
      <div role="tablist" aria-label="View" className="relative inline-flex rounded-xl border border-ink-600 bg-ink-900/90 p-1">
        {VIEWS.map((v, i) => {
          const on = v.id === view
          return (
            <button
              key={v.id} ref={(el) => (refs.current[i] = el)} role="tab" id={`tab-${v.id}`} aria-selected={on} aria-controls={`panel-${v.id}`}
              tabIndex={on ? 0 : -1} onClick={() => onChange(v.id)} onKeyDown={(e) => onKey(e, i)}
              className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors sm:px-4 ${on ? 'text-[#1b1304]' : 'text-bone-dim hover:text-bone'}`}
            >
              {on && <motion.span layoutId="view-pill" className="absolute inset-0 rounded-lg bg-amber" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative z-10 whitespace-nowrap">{v.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}

export default function App() {
  const [view, setView] = useState('myday')
  const [dir, setDir] = useState(1)
  const reduced = useReducedMotion()
  const change = (id) => {
    if (id === view) return
    setDir(VIEWS.findIndex((v) => v.id === id) > VIEWS.findIndex((v) => v.id === view) ? 1 : -1)
    setView(id)
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
  }
  const { Comp } = VIEWS.find((v) => v.id === view)

  return (
    <>
      <FlowField />
      <BurstLayer />
      <a href="#main" className="fixed left-3 top-3 z-[70] -translate-y-20 rounded-lg bg-amber px-3 py-2 font-semibold text-[#1b1304] focus:translate-y-0">Skip to content</a>

      <header className="sticky top-0 z-50 border-b border-ink-700/70 bg-ink-950/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2.5" aria-label="Outcome Ledger home">
            <Logo />
            <span className="hidden text-[1.02rem] font-semibold tracking-tight min-[400px]:inline">Outcome Ledger</span>
          </a>
          <ViewSwitch view={view} onChange={change} />
        </div>
      </header>

      <main id="main" className="relative z-10 mx-auto max-w-[1240px] overflow-x-clip px-4 pb-10 pt-10 sm:px-6 sm:pt-14">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={view} role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}
            custom={dir}
            variants={{
              enter: (d) => ({ opacity: 0, x: reduced ? 0 : d * 48 }),
              center: { opacity: 1, x: 0 },
              exit: (d) => ({ opacity: 0, x: reduced ? 0 : d * -48 }),
            }}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: reduced ? 0.01 : 0.32, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <Comp />
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 border-t border-ink-700/60 px-4 py-6 text-center text-xs text-mute">
        Outcome Ledger · sample data, nothing leaves your browser except an optional Outcome Coach call.
      </footer>
    </>
  )
}
