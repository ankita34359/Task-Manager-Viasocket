import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import Button from '../components/Button.jsx'

const PROOFS = ['Dashboard screenshot', 'Report link', 'Receiver confirmation', 'Pull request', 'Export / CSV']

/** Native <dialog>: focus trap, Esc to close, and focus returns to the opener. */
export default function DoneModal({ task, onClose, onSubmit }) {
  const ref = useRef(null)
  const [actualH, setActualH] = useState(String(task.estimateH))
  const [result, setResult] = useState('')
  const [proof, setProof] = useState('')
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
  }, [])

  const hoursOk = Number(actualH) > 0
  const resultOk = result.trim() !== '' && Number.isFinite(Number(result))
  const submit = (e) => {
    e.preventDefault()
    setTried(true)
    if (!hoursOk || !resultOk) return
    onSubmit({ actualH: Number(actualH), result: Number(result), proof: proof.trim() })
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="done-h"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-ink-600 bg-ink-850 p-0 text-bone shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <motion.form
        onSubmit={submit} noValidate
        initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
        className="grid gap-5 p-6"
      >
        <div>
          <h2 id="done-h" className="text-xl font-semibold tracking-tight">Mark done</h2>
          <p className="mt-1 text-sm text-bone-dim">{task.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="d-hours" className="label">Actual hours</label>
            <input id="d-hours" type="number" min="0.25" step="0.25" inputMode="decimal" className="field num" value={actualH} onChange={(e) => setActualH(e.target.value)} aria-invalid={tried && !hoursOk} aria-describedby="d-hours-e" />
            <p id="d-hours-e" className={`hint ${tried && !hoursOk ? '!text-bad' : ''}`}>{tried && !hoursOk ? 'Enter the hours you really spent.' : `Estimated ${task.estimateH}h`}</p>
          </div>
          <div>
            <label htmlFor="d-result" className="label">Result{task.unit ? ` (${task.unit})` : ''}</label>
            <input id="d-result" type="number" step="any" inputMode="decimal" className="field num" value={result} onChange={(e) => setResult(e.target.value)} placeholder={String(task.target ?? '')} aria-invalid={tried && !resultOk} aria-describedby="d-result-e" />
            <p id="d-result-e" className={`hint ${tried && !resultOk ? '!text-bad' : ''}`}>{tried && !resultOk ? 'Enter where the metric landed.' : `${task.baseline ?? '?'} → target ${task.target ?? '?'}`}</p>
          </div>
        </div>
        <p className="-mt-3 text-xs text-mute">Metric: {task.metric || 'not named'}</p>

        <div>
          <label htmlFor="d-proof" className="label">Proof label</label>
          <input id="d-proof" className="field" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="What shows this happened?" autoComplete="off" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROOFS.map((p) => (
              <button key={p} type="button" onClick={() => setProof(p)} className="rounded-full border border-ink-600 px-2.5 py-1 text-xs text-bone-dim hover:border-amber hover:text-amber">{p}</button>
            ))}
          </div>
          {!proof.trim() && <p className="hint">Without proof you lose 25 Measurability points on this task.</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-700 pt-4">
          <Button variant="ghost" magnetic={false} onClick={() => ref.current?.close()}>Cancel</Button>
          <Button type="submit">Mark done</Button>
        </div>
      </motion.form>
    </dialog>
  )
}
