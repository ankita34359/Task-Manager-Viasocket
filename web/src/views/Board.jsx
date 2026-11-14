import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import CountUp from '../components/CountUp.jsx'
import { Check, Clock, Play } from '../components/icons.jsx'
import { useNow } from '../components/hooks.js'
import { goalById } from '../lib/data.js'
import { fmtCountdown, fmtWhen, workingHoursBetween, fmtHours } from '../lib/time.js'
import { taskValue } from '../lib/scoring.js'
import { REPLY_LABEL } from '../state/ledger.jsx'

const COLUMNS = [
  { id: 'planned', title: 'Committed', empty: 'Commit a task and it lands here.' },
  { id: 'active', title: 'In progress', empty: 'Press Start when you begin.' },
  { id: 'done', title: 'Done', empty: 'Finished tasks wait here for the receiver.' },
]

function CountdownRing({ task, now }) {
  const total = Math.max(1, task.deadline - task.committedAt)
  const left = task.deadline - now
  const pct = Math.max(0, Math.min(1, left / total))
  const over = left < 0
  const urgent = !over && pct < 0.15
  const color = over || urgent ? '#e5694f' : pct < 0.4 ? '#fbc65d' : '#f5a524'
  const r = 22
  const circ = 2 * Math.PI * r
  const cd = fmtCountdown(left)
  return (
    <div className="flex items-center gap-3" data-testid="countdown" data-over={over}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" className="shrink-0">
        <g transform="rotate(-90 28 28)">
          <circle cx="28" cy="28" r={r} fill="none" stroke="#252932" strokeWidth="5" />
          <circle
            cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - (over ? 1 : pct))}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s' }}
          />
        </g>
      </svg>
      <div className="min-w-0">
        <p className={`num text-[1.05rem] font-semibold leading-tight ${over ? 'text-bad' : 'text-bone'}`}>
          {over ? '+' : ''}{cd.text}
        </p>
        <p className="text-xs text-mute">{over ? 'overdue' : 'left'} · due {fmtWhen(task.deadline)}</p>
      </div>
    </div>
  )
}

function DemoReply({ task, onReply }) {
  const opts = [
    ['useful', 'Useful'],
    ['partly', 'Partly'],
    ['not_useful', 'Not useful'],
  ]
  return (
    <div className="mt-3 rounded-xl border border-dashed border-amber/40 bg-amber/[0.05] p-3" role="group" aria-label="Demo control: simulate receiver reply">
      <p className="mb-2 flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-widest text-amber">
        <span className="rounded bg-amber px-1.5 py-0.5 text-[#1b1304]">Demo</span> Simulate {task.receiver}'s reply
      </p>
      <div className="flex flex-wrap gap-2">
        {opts.map(([key, label]) => (
          <Button
            key={key} size="sm" variant="ghost" magnetic={false} aria-pressed={task.reply === key}
            className={task.reply === key ? '!border-amber !bg-amber/15 !text-amber' : ''}
            onClick={(e) => onReply(task, key, e.currentTarget)}
          >
            {label}
          </Button>
        ))}
        {task.reply !== 'pending' && (
          <Button size="sm" variant="quiet" magnetic={false} onClick={(e) => onReply(task, 'pending', e.currentTarget)}>Reset</Button>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, now, onStart, onDone, onReply }) {
  const goal = goalById(task.goal)
  const open = task.status !== 'done'
  const val = taskValue(task)
  const left = workingHoursBetween(now, task.deadline)
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      data-task-id={task.id} data-status={task.status}
    >
      <Card className="p-4">
        <h4 className="text-[0.98rem] font-medium leading-snug">{task.title}</h4>
        <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-bone-dim">{task.impact} impact</span>
          <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-bone-dim">{task.reach}</span>
          {goal && <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-bone-dim">{goal.label}</span>}
        </p>

        {open && (
          <>
            <div className="mt-3"><CountdownRing task={task} now={now} /></div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-mute">
              <Clock width={13} height={13} /> {fmtHours(task.estimateH)} estimate · {fmtHours(Math.max(0, left))} working time left · for {task.receiver}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {task.status === 'planned' && (
                <Button size="sm" variant="ghost" onClick={() => onStart(task.id)}><Play width={12} height={12} /> Start</Button>
              )}
              <Button size="sm" onClick={() => onDone(task)}><Check width={14} height={14} strokeWidth={2.4} /> Mark done</Button>
            </div>
          </>
        )}

        {!open && (
          <>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[0.82rem]">
              <dt className="text-mute">{task.metric}</dt>
              <dd className="num text-right">{task.baseline ?? '–'} → <span className="text-bone">{task.result}</span>{task.unit ? ` ${task.unit}` : ''}</dd>
              <dt className="text-mute">Hours</dt>
              <dd className="num text-right">{task.actualH}h vs {task.estimateH}h est</dd>
              <dt className="text-mute">Proof</dt>
              <dd className="text-right">{task.proof || <span className="text-warn">none</span>}</dd>
            </dl>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-ink-900/80 px-3 py-2.5">
              {task.reply === 'pending' ? (
                <p className="flex items-center gap-2 text-sm" data-testid="waiting">
                  <span className="pulse-dot h-2 w-2 rounded-full bg-amber" />
                  Waiting for {task.receiver} on M91
                </p>
              ) : (
                <p className="text-sm" data-testid="replied">{task.receiver} replied: <strong className="font-semibold">{REPLY_LABEL[task.reply]}</strong></p>
              )}
              <p className="num shrink-0 text-right text-sm" aria-label={`${val} value`}>
                <CountUp value={val} decimals={1} prefix="+" duration={0.9} className="text-lg font-semibold text-amber" />
                <span className="ml-1 text-xs text-mute">value</span>
              </p>
            </div>
            <DemoReply task={task} onReply={onReply} />
          </>
        )}
      </Card>
    </motion.li>
  )
}

export default function Board({ tasks, onStart, onDone, onReply, boardRef }) {
  const now = useNow(1000)
  return (
    <section ref={boardRef} aria-labelledby="board-h" className="mt-14 scroll-mt-24">
      <div className="mb-5 flex items-end justify-between gap-3">
        <h2 id="board-h" className="text-2xl font-semibold tracking-tight">Today's board</h2>
        <p className="text-sm text-mute">{tasks.filter((t) => t.status !== 'done').length} open · {tasks.filter((t) => t.status === 'done').length} done</p>
      </div>
      <LayoutGroup>
        <div className="grid gap-5 lg:grid-cols-3">
          {COLUMNS.map((col) => {
            const list = tasks.filter((t) => t.status === col.id).sort((a, b) => (col.id === 'done' ? b.doneAt - a.doneAt : a.deadline - b.deadline))
            return (
              <div key={col.id} data-column={col.id}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-bone-dim">
                  {col.title} <span className="num rounded-md bg-ink-700 px-1.5 py-0.5 text-xs text-bone">{list.length}</span>
                </h3>
                <ul className="grid gap-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {list.map((t) => <TaskCard key={t.id} task={t} now={now} onStart={onStart} onDone={onDone} onReply={onReply} />)}
                  </AnimatePresence>
                </ul>
                {list.length === 0 && <p className="rounded-xl border border-dashed border-ink-600 px-4 py-6 text-center text-sm text-mute">{col.empty}</p>}
              </div>
            )
          })}
        </div>
      </LayoutGroup>
    </section>
  )
}
