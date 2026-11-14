import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Card from '../components/Card.jsx'
import Ring from '../components/Ring.jsx'
import CountUp from '../components/CountUp.jsx'
import Button from '../components/Button.jsx'
import { Check, Copy, Spark, StatusBadge } from '../components/icons.jsx'
import { fx } from '../lib/fx.js'
import { toneFor } from './CheckPanel.jsx'

export const COACH_STEPS = [
  'Reading the outcome statement',
  'Checking the metric and its numbers',
  'Testing the deadline against your estimate',
  'Looking for a named receiver',
  'Linking to your goal',
  'Writing the verdict',
]

export function ScanSteps({ step }) {
  return (
    <Card className="p-5 sm:p-6" role="status" aria-live="polite" aria-label="Outcome Coach is validating">
      <div className="flex items-center gap-2 text-amber">
        <Spark />
        <h2 className="text-lg font-semibold tracking-tight text-bone">Outcome Coach is reading</h2>
      </div>
      <p className="mt-1 text-sm text-bone-dim">Checking each part of the task against the rules.</p>
      <ol className="mt-5 grid gap-1">
        {COACH_STEPS.map((s, i) => {
          const done = i < step
          const current = i === step
          return (
            <motion.li
              key={s}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: done || current ? 1 : 0.4, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-lg px-2 py-2"
              data-step-state={done ? 'done' : current ? 'current' : 'todo'}
            >
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 ring-inset ${done ? 'bg-amber text-[#1b1304] ring-amber' : current ? 'ring-amber/70' : 'ring-ink-600'}`}>
                {done ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}><Check width={13} height={13} strokeWidth={2.6} /></motion.span>
                ) : current ? (
                  <span className="h-3 w-3 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-amber border-t-transparent" />
                ) : null}
              </span>
              <span className={`text-[0.95rem] ${done ? 'text-bone' : current ? 'text-bone' : 'text-mute'}`}>{s}{current ? '…' : ''}</span>
            </motion.li>
          )
        })}
      </ol>
    </Card>
  )
}

export function VerdictCard({ result, onEdit, onUse, onCommit, canCommit, commitHint }) {
  const ringRef = useRef(null)
  const headRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fx.pulse(ringRef.current)
    headRef.current?.focus({ preventScroll: true })
  }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.rewrite)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable: the text is selectable on screen */
    }
  }
  const rules = result.source === 'rules'

  return (
    <Card className="p-5 sm:p-6" aria-labelledby="verdict-h" data-testid="verdict" data-source={result.source}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ring-1 ring-inset ${rules ? 'text-bone-dim ring-ink-500' : 'bg-amber/10 text-amber ring-amber/50'}`}
          data-testid="source-label"
        >
          <Spark width={12} height={12} /> {result.label}
        </span>
        {result.fellBack && <span className="text-xs text-warn">Coach unavailable ({result.reason}). Showing local rules.</span>}
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div ref={ringRef}>
          <Ring value={result.score} size={118} stroke={10} delay={0.1} tone={toneFor(result.score)}>
            <div className="leading-none">
              <CountUp value={result.score} duration={1.4} className="text-4xl font-semibold" />
              <div className="num mt-1 text-xs text-mute">/ 100</div>
            </div>
          </Ring>
        </div>
        <div className="min-w-0">
          <h2 id="verdict-h" ref={headRef} tabIndex={-1} className="text-lg font-semibold leading-snug tracking-tight outline-none">{result.verdict}</h2>
          <p className="sr-only" role="status">Validation complete. Score {result.score} out of 100. {result.label}.</p>
        </div>
      </div>

      <ul className="mt-5 grid gap-1.5" aria-label="Results by check">
        {result.checks.map((c) => (
          <li key={c.id + c.label} className="flex items-start gap-2.5 text-[0.85rem]">
            <StatusBadge status={c.status} className="mt-px" />
            <span className="min-w-0 text-bone-dim"><span className="font-medium text-bone">{c.label}.</span> {c.note}</span>
          </li>
        ))}
      </ul>

      {result.fixes.length > 0 ? (
        <div className="mt-5">
          <h3 className="label !mb-2">What to fix</h3>
          <ol className="grid list-decimal gap-1.5 pl-5 text-[0.9rem] marker:text-amber marker:font-mono">
            {result.fixes.map((f, i) => <li key={i} className="pl-1">{f}</li>)}
          </ol>
        </div>
      ) : (
        <p className="mt-5 rounded-lg bg-ok/10 px-3 py-2 text-sm text-ok ring-1 ring-inset ring-ok/30">Nothing to fix. This task is ready to commit.</p>
      )}

      <div className="mt-5">
        <h3 className="label !mb-2">Sharpened wording <span className="normal-case tracking-normal text-mute">(built only from your inputs)</span></h3>
        <blockquote className="rounded-lg border-l-2 border-amber bg-ink-900/80 px-4 py-3 text-[0.92rem] leading-relaxed" data-testid="rewrite">{result.rewrite}</blockquote>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" magnetic={false} onClick={onUse}>Use this wording</Button>
          <Button variant="quiet" size="sm" magnetic={false} onClick={copy}>{copied ? <><Check width={14} height={14} /> Copied</> : <><Copy width={14} height={14} /> Copy</>}</Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink-700/80 pt-5">
        <Button onClick={onCommit} disabled={!canCommit} aria-describedby={!canCommit ? 'commit-hint-2' : undefined}>Commit to my day</Button>
        <Button variant="ghost" onClick={onEdit}>Edit task</Button>
        {!canCommit && <p id="commit-hint-2" className="w-full text-sm text-warn">{commitHint}</p>}
      </div>
    </Card>
  )
}
