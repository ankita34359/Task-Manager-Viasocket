import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import RevealText from '../components/RevealText.jsx'
import Card from '../components/Card.jsx'
import Ring from '../components/Ring.jsx'
import CountUp from '../components/CountUp.jsx'
import { Avatar, Chevron, Table } from '../components/icons.jsx'
import { useNow, useReducedMotion } from '../components/hooks.js'
import { PEOPLE, goalById, personById } from '../lib/data.js'
import { IMPACT_POINTS, REACH_MULTIPLIER, REPLY_FACTOR, summarize, taskValue } from '../lib/scoring.js'
import { fmtShortDate, fmtWhen } from '../lib/time.js'
import { REPLY_LABEL, useLedger } from '../state/ledger.jsx'
import { toneFor } from './CheckPanel.jsx'

export const VALUE_BENCHMARK = 60
const pct = (x) => `${Math.round(x * 100)}%`
const one = (n) => (Math.round(n * 10) / 10).toFixed(1)

/* ---------------------------------------------------------------- person switcher */
function PersonSwitcher({ value, onChange, stats }) {
  return (
    <div role="group" aria-label="Choose a person" className="scroll-thin -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      {PEOPLE.map((p) => {
        const on = p.id === value
        return (
          <button
            key={p.id} type="button" aria-pressed={on} onClick={() => onChange(p.id)}
            className={`relative flex shrink-0 snap-start items-center gap-2.5 rounded-xl px-3.5 py-2 text-left transition-colors ${on ? 'text-bone' : 'text-bone-dim hover:text-bone'}`}
          >
            {on && <motion.span layoutId="person-pill" className="absolute inset-0 rounded-xl bg-ink-700 ring-1 ring-amber/60" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative z-10 flex items-center gap-2.5">
              <Avatar person={p} size={30} />
              <span className="leading-tight">
                <span className="block text-sm font-medium">{p.name}{p.me ? ' (you)' : ''}</span>
                <span className="num block text-xs text-mute">{stats[p.id].closed} closed · {one(stats[p.id].value)} value</span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ---------------------------------------------------------------- score rings */
function ScoreRing({ label, formula, value, display, max, delay, children }) {
  return (
    <Card className="flex flex-col items-center p-5 text-center" data-testid={`ring-${label.toLowerCase()}`}>
      <Ring value={value} max={max} size={132} stroke={10} delay={delay} tone={max === 100 ? toneFor(value) : 'amber'}>
        <div className="leading-none">
          <CountUp value={display} decimals={max === 100 ? 0 : 1} duration={1.3} className="text-[2rem] font-semibold" />
          {max !== 100 && <div className="num mt-1 text-[0.7rem] text-mute">of {VALUE_BENCHMARK} pts</div>}
        </div>
      </Ring>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{label}</h3>
      <p className="mt-0.5 text-xs text-mute">{formula}</p>
      <dl className="num mt-3 grid w-full grid-cols-2 gap-x-3 gap-y-1 text-left text-xs">{children}</dl>
    </Card>
  )
}
const Stat = ({ k, v }) => (
  <>
    <dt className="truncate font-sans text-mute">{k}</dt>
    <dd className="text-right text-bone">{v}</dd>
  </>
)

function Rings({ s }) {
  return (
    <section aria-label="Scores" className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 xl:grid-cols-4">
      <ScoreRing label="Value" formula="Σ impact × reach × reply" value={s.value} display={s.value} max={VALUE_BENCHMARK} delay={0}>
        <Stat k="Closed" v={s.closed} />
        <Stat k="Committed" v={s.committed} />
      </ScoreRing>
      <ScoreRing label="Reliability" formula="50% say/do + 50% estimate accuracy" value={s.reliability.score} display={s.reliability.score} max={100} delay={0.12}>
        <Stat k="Say/do" v={pct(s.reliability.sayDo)} />
        <Stat k="Estimates" v={pct(s.reliability.accuracy)} />
      </ScoreRing>
      <ScoreRing label="Quality" formula="50% not reopened + 50% still working" value={s.quality.score} display={s.quality.score} max={100} delay={0.24}>
        <Stat k="Not reopened" v={pct(s.quality.notReopened)} />
        <Stat k="Still working" v={pct(s.quality.stillWorking)} />
      </ScoreRing>
      <ScoreRing label="Measurability" formula="25 pts each: proof, numbers, reply, goal" value={s.measurability.score} display={s.measurability.score} max={100} delay={0.36}>
        <Stat k="Proof" v={pct(s.measurability.parts.proof)} />
        <Stat k="Baseline+result" v={pct(s.measurability.parts.baselineAndResult)} />
        <Stat k="Replied" v={pct(s.measurability.parts.replied)} />
        <Stat k="Goal" v={pct(s.measurability.parts.goal)} />
      </ScoreRing>
    </section>
  )
}

/* ---------------------------------------------------------------- chart: closed vs value */
const niceMax = (m) => [4, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 150, 200].find((n) => n >= m) ?? Math.ceil(m / 50) * 50

function BarPanel({ title, subtitle, rows, max, color, selected, onPick, onTip, decimals, unit }) {
  const reduced = useReducedMotion()
  const ticks = [0, max / 2, max]
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <p className="mb-3 text-xs text-mute">{subtitle}</p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-[6.4rem] right-12" aria-hidden="true">
          {ticks.map((t, i) => (
            <div key={i} className="absolute inset-y-0 w-px bg-ink-700" style={{ left: `${(t / max) * 100}%` }}>
              <span className="num absolute -bottom-5 -translate-x-1/2 text-[0.68rem] text-mute">{t % 1 ? t.toFixed(1) : t}</span>
            </div>
          ))}
        </div>
        <ul className="relative grid gap-1">
          {rows.map((r, i) => {
            const on = r.person.id === selected
            return (
              <li key={r.person.id}>
                <button
                  type="button"
                  onClick={() => onPick(r.person.id)}
                  onPointerMove={(e) => onTip({ r, x: e.clientX, y: e.clientY })}
                  onPointerLeave={() => onTip(null)}
                  onFocus={(e) => { const b = e.currentTarget.getBoundingClientRect(); onTip({ r, x: b.left + b.width / 2, y: b.top }) }}
                  onBlur={() => onTip(null)}
                  aria-label={`${r.person.name}: ${r.display}${unit}. Select to view.`}
                  aria-current={on}
                  className={`grid h-10 w-full grid-cols-[6.4rem_1fr_3rem] items-center rounded-md text-left transition-colors ${on ? 'bg-ink-700/60' : 'hover:bg-ink-700/30'}`}
                >
                  <span className="flex items-center gap-2 truncate pl-1.5 text-sm"><Avatar person={r.person} size={20} /><span className={on ? 'font-semibold' : 'text-bone-dim'}>{r.person.name.split(' ')[0]}</span></span>
                  <span className="relative block h-full">
                    <motion.span
                      className="absolute left-0 top-1/2 block h-[14px] -translate-y-1/2 origin-left"
                      style={{ width: `${(r.v / max) * 100}%`, background: color, borderRadius: '0 4px 4px 0', opacity: on ? 1 : 0.62 }}
                      initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }}
                      transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                  </span>
                  <span className="num pl-2 text-sm font-semibold">{r.display}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="h-6" aria-hidden="true" />
      </div>
    </div>
  )
}

function ChartCard({ stats, selected, onPick }) {
  const [table, setTable] = useState(false)
  const [tip, setTip] = useState(null)
  const rows = PEOPLE.map((p) => ({ person: p, s: stats[p.id] }))
  const closed = rows.map((r) => ({ ...r, v: r.s.closed, display: String(r.s.closed) }))
  const vals = rows.map((r) => ({ ...r, v: r.s.value, display: one(r.s.value) }))
  const mostTasks = [...rows].sort((a, b) => b.s.closed - a.s.closed)[0]
  const mostValue = [...rows].sort((a, b) => b.s.value - a.s.value)[0]

  return (
    <Card className="relative p-5 sm:p-6" aria-labelledby="chart-h">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="chart-h" className="text-xl font-semibold tracking-tight">Tasks closed vs value delivered</h3>
          <p className="mt-1 text-sm text-bone-dim" data-testid="chart-insight">
            {mostTasks.person.id === mostValue.person.id
              ? `${mostValue.person.name} leads on both.`
              : `${mostTasks.person.name} closed the most tasks (${mostTasks.s.closed}); ${mostValue.person.name} delivered the most value (${one(mostValue.s.value)}).`}
          </p>
        </div>
        <button
          type="button" onClick={() => setTable((t) => !t)} aria-pressed={table}
          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600 px-2.5 py-1.5 text-xs text-bone-dim hover:border-ink-500 hover:text-bone"
        >
          <Table width={14} height={14} /> {table ? 'Show chart' : 'View as table'}
        </button>
      </div>

      {table ? (
        <table className="w-full text-sm">
          <caption className="sr-only">Tasks closed and value delivered per person</caption>
          <thead className="text-left text-xs uppercase tracking-wider text-mute">
            <tr><th className="py-2 font-medium">Person</th><th className="py-2 text-right font-medium">Tasks closed</th><th className="py-2 text-right font-medium">Value</th><th className="py-2 text-right font-medium">Value per task</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.person.id} className="border-t border-ink-700">
                <td className="py-2">{r.person.name}</td>
                <td className="num py-2 text-right">{r.s.closed}</td>
                <td className="num py-2 text-right">{one(r.s.value)}</td>
                <td className="num py-2 text-right">{r.s.closed ? one(r.s.value / r.s.closed) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          <BarPanel title="Tasks closed" subtitle="Count of finished tasks" rows={closed} max={niceMax(Math.max(...closed.map((r) => r.v)))} color="#b4aea1" selected={selected} onPick={onPick} onTip={setTip} unit=" tasks closed" />
          <BarPanel title="Value delivered" subtitle="Impact × reach × receiver reply" rows={vals} max={niceMax(Math.max(...vals.map((r) => r.v)))} color="#f5a524" selected={selected} onPick={onPick} onTip={setTip} unit=" value" />
        </div>
      )}

      <AnimatePresence>
        {tip && !table && (
          <motion.div
            key="tip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}
            className="pointer-events-none fixed z-50 min-w-40 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-xs shadow-xl"
            style={{ left: Math.min(tip.x + 14, window.innerWidth - 190), top: tip.y + 14 }} role="tooltip"
          >
            <p className="mb-1 font-medium text-bone-dim">{tip.r.person.name}</p>
            <p className="num text-sm font-semibold">{tip.r.s.closed} <span className="font-sans text-xs font-normal text-mute">tasks closed</span></p>
            <p className="num text-sm font-semibold text-amber">{one(tip.r.s.value)} <span className="font-sans text-xs font-normal text-mute">value</span></p>
            <p className="num mt-1 text-xs text-mute">{tip.r.s.closed ? one(tip.r.s.value / tip.r.s.closed) : '–'} value per task</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

/* ---------------------------------------------------------------- outcome ledger table */
const STATUS_LABEL = { planned: 'Committed', active: 'In progress', done: 'Done' }

function LedgerRow({ t, open, toggle }) {
  const goal = goalById(t.goal)
  const v = taskValue(t)
  const impactPts = IMPACT_POINTS[t.impact]
  const reachMul = REACH_MULTIPLIER[t.reach]
  const factor = REPLY_FACTOR[t.reply]
  const done = t.status === 'done'
  const id = `led-${t.id}`
  return (
    <tbody className="border-t border-ink-700/80" data-task-row={t.id}>
      <tr onClick={toggle} className="cursor-pointer align-top transition-colors hover:bg-ink-700/25">
        <td className="py-3 pl-1 pr-2">
          <button type="button" aria-expanded={open} aria-controls={id} className="flex w-full items-start gap-2 text-left">
            <Chevron className={`mt-1 shrink-0 text-mute transition-transform ${open ? 'rotate-180 text-amber' : ''}`} />
            <span className="min-w-0">
              <span className="block text-[0.92rem] font-medium leading-snug">{t.title}</span>
              <span className="num text-xs text-mute">{fmtShortDate(t.doneAt ?? t.deadline)} · {STATUS_LABEL[t.status]}</span>
            </span>
          </button>
        </td>
        <td className="hidden py-3 pr-3 text-sm text-bone-dim md:table-cell">{goal?.label ?? <span className="text-warn">No goal</span>}</td>
        <td className="hidden py-3 pr-3 text-sm text-bone-dim sm:table-cell">{t.receiver}</td>
        <td className="py-3 pr-3 text-sm">
          {done ? <span className={t.reply === 'not_useful' ? 'text-bad' : t.reply === 'pending' ? 'text-mute' : 'text-ok'}>{REPLY_LABEL[t.reply]}</span> : <span className="text-mute">–</span>}
        </td>
        <td className="num py-3 pr-2 text-right text-[0.95rem] font-semibold">{done ? <span className={v > 0 ? 'text-amber' : 'text-mute'}>{one(v)}</span> : <span className="text-mute">–</span>}</td>
      </tr>
      <AnimatePresence initial={false}>
        {open && (
          <tr key="detail" id={id}>
            <td colSpan={5} className="p-0">
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }} className="overflow-hidden">
                <div className="grid gap-x-8 gap-y-3 px-3 pb-4 pt-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <Detail k="Metric" v={`${t.metric || 'not named'}`} />
                  <Detail k="Baseline → result" v={`${t.baseline ?? '–'} → ${t.result ?? 'pending'}${t.unit ? ' ' + t.unit : ''} (target ${t.target ?? '–'})`} mono />
                  <Detail k="Proof" v={t.proof || (done ? 'None attached' : 'Not finished')} />
                  <Detail k="Estimate vs actual" v={`${t.estimateH}h vs ${t.actualH ?? '–'}${t.actualH ? 'h' : ''}`} mono />
                  <Detail k="Deadline" v={fmtWhen(t.deadline)} mono />
                  <Detail k="Receiver" v={`${t.receiver}${done ? ` (${REPLY_LABEL[t.reply]})` : ''}`} />
                  <Detail k="Impact × reach × reply" v={done ? `${t.impact} ${impactPts} × ${t.reach} ${reachMul} × ${REPLY_LABEL[t.reply]} ${factor} = ${one(v)}` : 'Counted once finished'} mono wide />
                  {done && <Detail k="Quality" v={`${t.reopened ? 'Reopened' : 'Not reopened'} · ${t.stillWorking === false ? 'No longer working' : 'Still working'}`} />}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </tbody>
  )
}
const Detail = ({ k, v, mono, wide }) => (
  <div className={wide ? 'lg:col-span-2' : ''}>
    <dt className="label !mb-0.5 !text-[0.68rem]">{k}</dt>
    <dd className={mono ? 'num text-[0.85rem]' : 'text-[0.9rem]'}>{v}</dd>
  </div>
)

function Ledger({ tasks }) {
  const [openIds, setOpen] = useState(() => new Set())
  const toggle = (id) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const sorted = [...tasks].sort((a, b) => (b.doneAt ?? b.committedAt) - (a.doneAt ?? a.committedAt))
  return (
    <Card className="p-4 sm:p-6" aria-labelledby="ledger-h">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h3 id="ledger-h" className="text-xl font-semibold tracking-tight">Outcome ledger</h3>
        <p className="num text-xs text-mute">{sorted.length} tasks</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <caption className="sr-only">Every task for this person with its value. Select a row to expand.</caption>
          <thead className="text-xs uppercase tracking-wider text-mute">
            <tr>
              <th scope="col" className="py-2 pl-1 pr-2 font-medium">Task</th>
              <th scope="col" className="hidden py-2 pr-3 font-medium md:table-cell">Goal</th>
              <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">Receiver</th>
              <th scope="col" className="py-2 pr-3 font-medium">Reply</th>
              <th scope="col" className="py-2 pr-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          {sorted.map((t) => <LedgerRow key={t.id} t={t} open={openIds.has(t.id)} toggle={() => toggle(t.id)} />)}
        </table>
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- live feed */
const KIND = { commit: ['Committed', 'text-bone-dim'], done: ['Finished', 'text-amber'], reply: ['Reply', 'text-ok'] }
function ago(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return `${Math.floor(s / 3600)}h ago`
}

function Feed({ feed, selected }) {
  const now = useNow(5000)
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="feed-h">
      <div className="mb-4 flex items-center justify-between">
        <h3 id="feed-h" className="text-xl font-semibold tracking-tight">Live feed</h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber ring-1 ring-inset ring-amber/40">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber" /> Live
        </span>
      </div>
      <ol className="grid gap-1" role="log" aria-live="polite" aria-label="Task activity">
        <AnimatePresence initial={false}>
          {feed.map((e) => {
            const p = personById(e.personId)
            const [kind, cls] = KIND[e.kind]
            const fresh = now - e.at < 8000
            return (
              <motion.li
                key={e.id} layout
                initial={{ opacity: 0, x: -24, backgroundColor: 'rgba(245,165,36,0.22)' }}
                animate={{ opacity: 1, x: 0, backgroundColor: fresh ? 'rgba(245,165,36,0.10)' : 'rgba(245,165,36,0)' }}
                transition={{ duration: 0.5 }}
                className={`flex gap-3 rounded-lg px-2.5 py-2.5 ${p.id === selected ? 'ring-1 ring-inset ring-ink-600' : ''}`}
                data-feed-kind={e.kind}
              >
                <Avatar person={p} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.88rem] leading-snug"><span className="font-semibold">{p.name.split(' ')[0]}</span> <span className="text-bone-dim">{e.text}</span></p>
                  <p className="mt-0.5 text-xs text-mute">{e.note}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[0.68rem] font-semibold uppercase tracking-wider ${cls}`}>{kind}</p>
                  <p className="num text-[0.7rem] text-mute">{ago(now - e.at)}</p>
                </div>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ol>
    </Card>
  )
}

/* ---------------------------------------------------------------- view */
export default function Manager() {
  const { tasks, feed } = useLedger()
  const [personId, setPersonId] = useState(PEOPLE[0].id)
  const now = useNow(30000)
  const stats = useMemo(() => Object.fromEntries(PEOPLE.map((p) => [p.id, summarize(tasks.filter((t) => t.owner === p.id), now)])), [tasks, now])
  const mine = useMemo(() => tasks.filter((t) => t.owner === personId), [tasks, personId])
  const person = personById(personId)

  return (
    <div>
      <header className="mb-8 max-w-3xl">
        <p className="num mb-3 text-xs uppercase tracking-[0.22em] text-amber">Manager view</p>
        <RevealText as="h1" text="Who delivered *value*, not who closed tickets." className="text-[2.2rem] font-semibold leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.6rem]" />
        <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-bone-dim">
          Scores come from fixed formulas over the ledger. Nothing here is set by the coach.
        </p>
      </header>

      <PersonSwitcher value={personId} onChange={setPersonId} stats={stats} />
      <p className="sr-only" role="status">Showing {person.name}</p>

      <div className="mt-6 grid gap-6">
        <Rings s={stats[personId]} />
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="grid min-w-0 gap-6">
            <ChartCard stats={stats} selected={personId} onPick={setPersonId} />
            <Ledger tasks={mine} />
          </div>
          <div className="xl:sticky xl:top-24"><Feed feed={feed} selected={personId} /></div>
        </div>
      </div>
    </div>
  )
}
