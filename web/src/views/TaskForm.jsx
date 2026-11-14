import { GOALS, RECEIVER_SUGGESTIONS } from '../lib/data.js'

const IMPACTS = ['Low', 'Medium', 'High']
const REACHES = ['Me', 'Team', 'Customers']

function Segmented({ name, legend, options, value, onChange, hint }) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="seg" role="radiogroup" aria-label={legend}>
        {options.map((o) => (
          <label key={o}>
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(name, o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
      {hint && <p className="hint">{hint}</p>}
    </fieldset>
  )
}

export default function TaskForm({ values, onChange, disabled }) {
  const set = (e) => onChange(e.target.name, e.target.value)
  return (
    <fieldset disabled={disabled} className="grid min-w-0 gap-5 border-0 p-0 transition-opacity data-[busy=true]:opacity-70" data-busy={disabled}>
      <legend className="sr-only">Today's task</legend>

      <div>
        <label htmlFor="f-title" className="label">Task: what will be true when you are done?</label>
        <textarea
          id="f-title" name="title" rows={2} className="field resize-y" value={values.title} onChange={set}
          placeholder="e.g. Cut first response time on billing tickets with a one-reply macro"
        />
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-[1fr_7rem_7rem]">
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="f-metric" className="label">Metric: what number moves?</label>
          <input id="f-metric" name="metric" className="field" value={values.metric} onChange={set} placeholder="Median first response (hours)" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="f-baseline" className="label">Baseline</label>
          <input id="f-baseline" name="baseline" inputMode="decimal" className="field num" value={values.baseline} onChange={set} placeholder="6.5" autoComplete="off" />
        </div>
        <div>
          <label htmlFor="f-target" className="label">Target</label>
          <input id="f-target" name="target" inputMode="decimal" className="field num" value={values.target} onChange={set} placeholder="4" autoComplete="off" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-3 gap-y-5 min-[420px]:grid-cols-[1fr_8.5rem]">
        <div>
          <label htmlFor="f-deadline" className="label">Deadline (date and time)</label>
          <input id="f-deadline" name="deadline" type="datetime-local" className="field num" value={values.deadline} onChange={set} />
        </div>
        <div>
          <label htmlFor="f-est" className="label">Estimate (hours)</label>
          <input id="f-est" name="estimateH" type="number" min="0.25" step="0.25" inputMode="decimal" className="field num" value={values.estimateH} onChange={set} placeholder="3" />
        </div>
      </div>

      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <Segmented name="impact" legend="Impact" options={IMPACTS} value={values.impact} onChange={onChange} />
        <Segmented name="reach" legend="Reach" options={REACHES} value={values.reach} onChange={onChange} />
      </div>

      <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
        <div>
          <label htmlFor="f-goal" className="label">Goal</label>
          <select id="f-goal" name="goal" className="field" value={values.goal} onChange={set}>
            <option value="">Choose a goal…</option>
            {GOALS.map((g) => (
              <option key={g.id} value={g.id}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-receiver" className="label">Receiver: who benefits?</label>
          <input id="f-receiver" name="receiver" list="receivers" className="field" value={values.receiver} onChange={set} placeholder="A person, e.g. Anil Kapoor" autoComplete="off" />
          <datalist id="receivers">
            {RECEIVER_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>
      </div>
    </fieldset>
  )
}
