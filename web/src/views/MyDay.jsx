import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import RevealText from '../components/RevealText.jsx'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import CountUp from '../components/CountUp.jsx'
import { useNow, useReducedMotion } from '../components/hooks.js'
import { fx } from '../lib/fx.js'
import { ME, goalById } from '../lib/data.js'
import { addWorkingHours, fromLocalInput, parseQuantity, toLocalInput } from '../lib/time.js'
import { rulesCheck, validateTask } from '../lib/validate.js'
import { value as sumValue } from '../lib/scoring.js'
import { useLedger } from '../state/ledger.jsx'
import TaskForm from './TaskForm.jsx'
import CheckPanel from './CheckPanel.jsx'
import { COACH_STEPS, ScanSteps, VerdictCard } from './CoachPanel.jsx'
import Board from './Board.jsx'
import DoneModal from './DoneModal.jsx'

const EMPTY = { title: '', metric: '', baseline: '', target: '', deadline: '', estimateH: '', impact: 'Medium', reach: 'Team', goal: '', receiver: '' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function example(kind) {
  const now = Date.now()
  if (kind === 'clear') return { ...EMPTY }
  if (kind === 'vague')
    return { ...EMPTY, title: 'work on support stuff', deadline: toLocalInput(now + 3600 * 1000), estimateH: '6', impact: 'High', reach: 'Me', receiver: 'team' }
  let d = addWorkingHours(now, 6)
  if (d.getHours() >= 17) d = new Date(+d - 3 * 3600 * 1000)
  d.setMinutes(0, 0, 0)
  return {
    title: 'Cut first response time on billing tickets with a one-reply refund macro',
    metric: 'Median first response (hours)', baseline: '6.5', target: '4',
    deadline: toLocalInput(d), estimateH: '3', impact: 'High', reach: 'Customers',
    goal: 'g-response', receiver: 'Anil Kapoor',
  }
}

function BeamOverlay({ reduced }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[18px]" data-testid="scan-beam">
      <div className="absolute inset-0 bg-amber/[0.04]" />
      {reduced ? (
        <div className="absolute inset-x-0 top-1/2 h-px bg-amber" />
      ) : (
        <motion.div
          className="absolute inset-x-0 h-24"
          initial={{ top: '-12%' }}
          animate={{ top: ['-12%', '100%'] }}
          transition={{ duration: 1.7, ease: 'linear', repeat: Infinity }}
        >
          <div className="absolute inset-x-0 bottom-0 top-0 bg-gradient-to-t from-amber/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-amber shadow-[0_0_24px_6px_rgba(245,165,36,0.65)]" />
        </motion.div>
      )}
    </div>
  )
}

export default function MyDay() {
  const { tasks, commitTask, startTask, finishTask, setReply } = useLedger()
  const reduced = useReducedMotion()
  const now = useNow(15000)

  const [form, setForm] = useState(EMPTY)
  const [phase, setPhase] = useState('idle') // idle | scanning | verdict
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [doneFor, setDoneFor] = useState(null)
  const [note, setNote] = useState('')
  const run = useRef(0)
  const boardRef = useRef(null)
  const panelRef = useRef(null)
  const pillRef = useRef(null)

  const onChange = useCallback((name, val) => setForm((f) => ({ ...f, [name]: val })), [])

  const task = useMemo(
    () => ({
      title: form.title, metric: form.metric, baseline: form.baseline, target: form.target,
      deadline: fromLocalInput(form.deadline), estimateH: form.estimateH === '' ? null : Number(form.estimateH),
      impact: form.impact, reach: form.reach, goal: form.goal, goalLabel: goalById(form.goal)?.label, receiver: form.receiver,
    }),
    [form],
  )
  const live = useMemo(() => rulesCheck(task, now), [task, now])

  const missing = []
  if (!form.title.trim()) missing.push('a task')
  if (!(task.deadline && task.deadline > Date.now())) missing.push('a deadline in the future')
  if (!(task.estimateH > 0)) missing.push('an estimate')
  if (!form.receiver.trim()) missing.push('a receiver')
  const canCommit = missing.length === 0
  const commitHint = canCommit ? '' : `To commit, add ${missing.join(', ')}.`

  const mine = useMemo(() => tasks.filter((t) => t.owner === ME.id && (t.status !== 'done' || t.today)), [tasks])
  const valueToday = sumValue(mine.filter((t) => t.today))

  // ---- Coach -------------------------------------------------------------
  const askCoach = async () => {
    const id = ++run.current
    setPhase('scanning')
    setStep(0)
    setResult(null)
    if (window.matchMedia('(max-width: 1023px)').matches) panelRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    const snapshot = task
    const pending = validateTask(snapshot) // the single validation entry point
    const tick = reduced ? 80 : 470
    for (let i = 0; i < COACH_STEPS.length; i++) {
      await sleep(tick)
      if (run.current !== id) return
      setStep(i + 1)
    }
    const res = await pending
    if (run.current !== id) return
    setResult(res)
    setPhase('verdict')
  }
  const backToEdit = () => {
    run.current++
    setPhase('idle')
    document.getElementById('f-title')?.focus()
  }

  // ---- Actions -----------------------------------------------------------
  const commit = () => {
    if (!canCommit) return
    const b = parseQuantity(form.baseline)
    const t = parseQuantity(form.target)
    const created = commitTask({ ...form, baselineNum: b.value, targetNum: t.value, unit: t.unit || b.unit, deadline: task.deadline }, result)
    run.current++
    setPhase('idle')
    setResult(null)
    setForm(EMPTY)
    setNote(`Committed "${created.title}". It is on your board.`)
    fx.pulse(boardRef.current?.querySelector('h2') ?? undefined)
    const el = boardRef.current
    if (el && el.getBoundingClientRect().top > window.innerHeight * 0.75) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  const submitDone = (data) => {
    const t = doneFor
    finishTask(t.id, data)
    setDoneFor(null)
    setNote(`Marked done. Waiting for ${t.receiver} on M91.`)
  }

  const reply = (t, key, el) => {
    setReply(t.id, key)
    setNote(`${t.receiver} replied: ${key === 'not_useful' ? 'Not useful' : key === 'partly' ? 'Partly useful' : key === 'useful' ? 'Useful' : 'pending'}.`)
    if (key === 'useful' || key === 'partly') {
      fx.burst(el, { count: key === 'useful' ? 90 : 50 })
      fx.pulse(pillRef.current)
    }
  }

  useEffect(() => {
    if (!note) return
    const id = setTimeout(() => setNote(''), 6000)
    return () => clearTimeout(id)
  }, [note])

  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <p className="num mb-3 text-xs uppercase tracking-[0.22em] text-amber">My Day · {ME.name}</p>
        <RevealText as="h1" text="Write the *outcome*, not the errand." className="text-[2.2rem] font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.6rem]" />
        <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-bone-dim">
          Enter today's tasks with the number each one moves. The coach checks them before you commit. Value is only counted once a receiver says it helped.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="relative p-5 sm:p-7" aria-labelledby="form-h">
          {phase === 'scanning' && <BeamOverlay reduced={reduced} />}
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="form-h" className="text-xl font-semibold tracking-tight">New task</h2>
            <p className="num rounded-full bg-ink-900 px-3 py-1 text-sm text-bone-dim ring-1 ring-ink-600 lg:hidden" aria-hidden="true">
              Check <span className="font-semibold text-bone">{live.score}</span>/100
            </p>
          </div>
          <TaskForm values={form} onChange={onChange} disabled={phase === 'scanning'} />
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-700/80 pt-5">
            <Button onClick={askCoach} disabled={phase === 'scanning'} data-testid="ask-coach">
              {phase === 'scanning' ? 'Coach is reading…' : 'Ask the Outcome Coach'}
            </Button>
            <Button variant="ghost" onClick={commit} disabled={!canCommit || phase === 'scanning'} aria-describedby="commit-hint" data-testid="commit">
              Commit to my day
            </Button>
            <p id="commit-hint" className="w-full text-sm text-mute" aria-live="polite">{commitHint || 'Ready to commit. The coach is optional but worth the ten seconds.'}</p>
          </div>
        </Card>

        <div ref={panelRef} className="scroll-mt-20 lg:sticky lg:top-24">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={phase}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {phase === 'idle' && <CheckPanel live={live} onExample={(k) => setForm(example(k))} />}
              {phase === 'scanning' && <ScanSteps step={step} />}
              {phase === 'verdict' && result && (
                <VerdictCard
                  result={result}
                  onEdit={backToEdit}
                  onUse={() => { setForm((f) => ({ ...f, title: result.rewrite })); backToEdit() }}
                  onCommit={commit}
                  canCommit={canCommit}
                  commitHint={commitHint}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <Board tasks={mine} onStart={startTask} onDone={setDoneFor} onReply={reply} boardRef={boardRef} />

      {/* Always-visible value counter */}
      <div
        ref={pillRef}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-2xl border border-amber/40 bg-ink-850/95 px-4 py-2.5 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur max-[420px]:left-4 max-[420px]:justify-between"
        data-testid="value-pill"
      >
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-bone-dim">Value today</span>
        <CountUp value={valueToday} decimals={1} duration={1.1} className="text-2xl font-semibold text-amber" />
      </div>
      <div className="h-20" aria-hidden="true" />

      <p className="sr-only-live" role="status" aria-live="polite">{note}</p>
      {note && (
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="fixed bottom-20 right-4 z-40 max-w-[min(22rem,calc(100vw-2rem))] rounded-xl bg-ink-700 px-4 py-2.5 text-sm shadow-lg ring-1 ring-ink-500 max-[420px]:left-4" aria-hidden="true">{note}</motion.p>
      )}

      {doneFor && <DoneModal task={doneFor} onClose={() => setDoneFor(null)} onSubmit={submitDone} />}
    </div>
  )
}
