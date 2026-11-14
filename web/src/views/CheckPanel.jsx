import { motion } from 'framer-motion'
import Card from '../components/Card.jsx'
import Ring from '../components/Ring.jsx'
import CountUp from '../components/CountUp.jsx'
import { StatusBadge } from '../components/icons.jsx'

export const toneFor = (score) => (score >= 85 ? 'ok' : score < 35 ? 'bad' : 'amber')

export default function CheckPanel({ live, onExample }) {
  return (
    <Card className="p-5 sm:p-6" aria-labelledby="check-h">
      <div className="flex items-center gap-4">
        <Ring value={live.score} size={92} stroke={8} tone={toneFor(live.score)}>
          <div className="leading-none">
            <CountUp value={live.score} duration={0.5} className="text-[1.65rem] font-semibold" />
          </div>
        </Ring>
        <div className="min-w-0">
          <h2 id="check-h" className="text-lg font-semibold tracking-tight">Live check</h2>
          <p className="text-sm text-bone-dim">Scores your task out of 100 as you type. <span className="text-mute">Rules preview</span></p>
        </div>
      </div>

      <ul className="mt-5 divide-y divide-ink-700/80" aria-label="Task checks">
        {live.checks.map((c) => (
          <motion.li key={c.id} layout className="grid grid-cols-[5.2rem_1fr] items-start gap-x-3 gap-y-0.5 py-3 first:pt-0" data-check={c.id} data-status={c.status}>
            <StatusBadge status={c.status} className="mt-0.5 justify-self-start" />
            <div className="min-w-0">
              <p className="text-[0.92rem] font-medium leading-tight">{c.label} <span className="num text-xs text-mute">{c.weight}</span></p>
              <p className="mt-0.5 text-[0.82rem] leading-snug text-bone-dim">{c.note}</p>
            </div>
          </motion.li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-700/80 pt-4 text-sm text-mute">
        <span>Try an example:</span>
        <button type="button" onClick={() => onExample('strong')} className="rounded-md px-2 py-1 text-bone-dim underline decoration-ink-500 underline-offset-4 hover:text-amber hover:decoration-amber">Strong</button>
        <button type="button" onClick={() => onExample('vague')} className="rounded-md px-2 py-1 text-bone-dim underline decoration-ink-500 underline-offset-4 hover:text-amber hover:decoration-amber">Vague</button>
        <button type="button" onClick={() => onExample('clear')} className="rounded-md px-2 py-1 text-bone-dim underline decoration-ink-500 underline-offset-4 hover:text-amber hover:decoration-amber">Clear form</button>
      </div>
    </Card>
  )
}
