// The one place a task is validated.
//
//   validateTask(task, opts) -> Promise<Result>
//
// If VITE_COACH_URL is set, the task is POSTed there as
//   { task: {...}, now: ISO-string }
// and the reply is shown. The reply must be JSON shaped like
//   { score: 0-100, verdict?: string, checks?: [{ id, label?, status, note? }],
//     fixes?: string[], rewrite?: string }
// (it may also be wrapped as { result: {...} }). Missing optional fields are
// filled from the local rules so the UI is never half empty.
//
// If the URL is empty, or the call fails, times out or returns something
// unusable, the local rules run and the result is labelled "Rules preview".
//
// `rulesCheck` is the synchronous rule engine behind that fallback. The live
// check panel calls it on every keystroke, so what you see while typing is
// exactly what the fallback will say.

import { addWorkingHours, fmtHours, fmtWhen, isWorkingTime, parseQuantity, workingHoursBetween } from './time.js'

export const COACH_URL = (import.meta.env?.VITE_COACH_URL ?? '').trim()

export const RULES_LABEL = 'Rules preview'
export const COACH_LABEL = 'Outcome Coach'

export const CHECK_ORDER = ['outcome', 'metric', 'deadline', 'receiver', 'goal']
const WEIGHTS = { outcome: 20, metric: 25, deadline: 25, receiver: 15, goal: 15 }
const FACTOR = { pass: 1, warn: 0.5, fail: 0 }
const LABELS = {
  outcome: 'Clear outcome',
  metric: 'Metric with numbers',
  deadline: 'Deadline vs estimate',
  receiver: 'Receiver named',
  goal: 'Goal linked',
}

const VAGUE = /\b(work(ing)? on|look(ing)? into|misc(ellaneous)?|stuff|various|follow[- ]?up|catch[- ]?up|deal with|try to|help with|think about|attend|meeting|sync)\b/i
const SELF = /^(me|myself|self|i|nobody|none|n\/?a|tbd|-+)$/i
const GROUP = /^(team|the team|everyone|anyone|someone|users?|customers?|clients?|people|company|all|management)$/i

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s)
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean)

function verdictFor(score) {
  if (score >= 85) return 'Commit-ready. This task states an outcome someone can verify.'
  if (score >= 60) return 'Almost there. Tighten the weak rows before you commit.'
  if (score >= 35) return 'Still an activity, not an outcome. Fix the red rows first.'
  return 'Not yet a task anyone could judge. Start with the outcome and the number.'
}

function checkOutcome(t) {
  const w = words(t.title)
  if (w.length < 3)
    return ['fail', 'Too short to be an outcome.', 'Say what will be true when you are done, in at least five words.']
  if (VAGUE.test(t.title))
    return ['warn', 'Reads like an activity ("work on", "meeting", "follow up").', 'Replace the activity with the result it produces.']
  if (w.length < 5)
    return ['warn', 'Short. A reader may not know what "done" looks like.', 'Add what changes and for what.']
  return ['pass', 'States a result, not just an activity.', '']
}

function checkMetric(t) {
  const hasMetric = words(t.metric).length > 0 && String(t.metric).trim().length >= 3
  const b = parseQuantity(t.baseline).value
  const g = parseQuantity(t.target).value
  if (!hasMetric)
    return ['fail', 'No metric. Nothing is named that will move.', 'Name the number that moves, for example "median first response (hours)".']
  if (b === null && g === null)
    return ['fail', 'Metric has no baseline or target.', 'Give today\'s value (baseline) and the value you will reach (target).']
  if (b === null || g === null)
    return ['warn', `Missing the ${b === null ? 'baseline' : 'target'} number.`, `Add the ${b === null ? 'baseline (where it is now)' : 'target (where it will be)'}.`]
  if (b === g)
    return ['warn', 'Baseline and target are the same, so nothing would move.', 'Set a target that differs from the baseline.']
  return ['pass', `Moves ${t.metric.trim()} from ${b} to ${g}.`, '']
}

function checkDeadline(t, now) {
  const est = Number(t.estimateH)
  if (!t.deadline || !(est > 0))
    return ['fail', 'Needs both a deadline and an estimate in hours.', 'Set a deadline and how many hours the work will take.']
  if (t.deadline <= now)
    return ['fail', 'The deadline is already in the past.', 'Pick a deadline that is still ahead of you.']
  const avail = workingHoursBetween(now, t.deadline)
  const earliest = addWorkingHours(now, est * 1.25)
  if (avail < est)
    return [
      'fail',
      `Only ${fmtHours(avail)} of working time before the deadline, but the estimate is ${fmtHours(est)}.`,
      `Move the deadline to ${fmtWhen(earliest)} or later (estimate plus a 25% buffer), or cut scope.`,
    ]
  if (avail < est * 1.25)
    return ['warn', `${fmtHours(avail)} of working time for ${fmtHours(est)} of work leaves no buffer.`, `Allow about 25% slack: ${fmtWhen(earliest)} or later.`]
  if (!isWorkingTime(t.deadline))
    return ['warn', `Fits the estimate (${fmtHours(avail)} available), but ${fmtWhen(t.deadline)} is outside Mon-Fri 9-18.`, 'Land the deadline inside working hours so the receiver can respond.']
  if (est > 16)
    return ['warn', `A ${fmtHours(est)} estimate is long for one daily task.`, 'Split it into pieces that each deliver something checkable.']
  return ['pass', `${fmtHours(avail)} of working time for ${fmtHours(est)} of work.`, '']
}

function checkReceiver(t) {
  const r = String(t.receiver ?? '').trim()
  if (!r) return ['fail', 'No receiver. Nobody can confirm the value.', 'Name the person who benefits and can say whether it was useful.']
  if (SELF.test(r)) return ['fail', 'The receiver is you. Value needs someone else to confirm it.', 'Name another person who benefits.']
  if (GROUP.test(r)) return ['warn', `"${r}" is a group, not a person.`, 'Name one person who will reply, even if the group benefits.']
  return ['pass', `${r} will confirm whether it helped.`, '']
}

function checkGoal(t) {
  return t.goal
    ? ['pass', 'Linked to a goal.', '']
    : ['fail', 'Not linked to any goal.', 'Pick the goal this task moves. If none fits, ask whether it should be done.']
}

function sharpen(t) {
  const title = cap(String(t.title ?? '').trim().replace(/[.\s]+$/, '')) || '‹state the outcome›'
  const metric = String(t.metric ?? '').trim() || '‹name the metric›'
  const base = String(t.baseline ?? '').trim() || '‹baseline›'
  const target = String(t.target ?? '').trim() || '‹target›'
  const when = t.deadline ? fmtWhen(t.deadline) : '‹deadline›'
  const who = String(t.receiver ?? '').trim() || '‹receiver›'
  const goal = t.goalLabel || t.goal
  const tail = goal ? `, toward "${goal}"` : ', toward ‹goal›'
  return `${title}: move ${metric} from ${base} to ${target} by ${when} for ${who} (${t.reach ?? 'Me'})${tail}.`
}

/** Synchronous rule engine. Pure: same task and `now` give the same result. */
export function rulesCheck(task, now = Date.now()) {
  const t = task ?? {}
  const raw = {
    outcome: checkOutcome(t),
    metric: checkMetric(t),
    deadline: checkDeadline(t, now),
    receiver: checkReceiver(t),
    goal: checkGoal(t),
  }
  const checks = CHECK_ORDER.map((id) => {
    const [status, note, fix] = raw[id]
    return { id, label: LABELS[id], status, note, fix, weight: WEIGHTS[id] }
  })
  const score = Math.round(checks.reduce((s, c) => s + c.weight * FACTOR[c.status], 0))
  return {
    source: 'rules',
    label: RULES_LABEL,
    score,
    verdict: verdictFor(score),
    checks,
    fixes: checks.filter((c) => c.status !== 'pass').map((c) => c.fix),
    rewrite: sharpen(t),
  }
}

function normalizeRemote(json, local) {
  const raw = json && typeof json === 'object' ? (json.result && typeof json.result === 'object' ? json.result : json) : null
  const score = raw ? Number(raw.score) : NaN
  if (!Number.isFinite(score)) return null
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  let checks = local.checks
  if (Array.isArray(raw.checks) && raw.checks.length) {
    checks = raw.checks
      .filter((c) => c && ['pass', 'warn', 'fail'].includes(c.status))
      .map((c) => ({
        id: String(c.id ?? c.label ?? ''),
        label: String(c.label ?? LABELS[c.id] ?? c.id ?? 'Check'),
        status: c.status,
        note: String(c.note ?? ''),
        fix: String(c.fix ?? ''),
      }))
    if (!checks.length) checks = local.checks
  }
  const fixes = Array.isArray(raw.fixes) ? raw.fixes.map(String) : checks.filter((c) => c.status !== 'pass' && (c.fix || c.note)).map((c) => c.fix || c.note)
  return {
    source: 'coach',
    label: COACH_LABEL,
    score: clamped,
    verdict: typeof raw.verdict === 'string' && raw.verdict ? raw.verdict : verdictFor(clamped),
    checks,
    fixes,
    rewrite: typeof raw.rewrite === 'string' && raw.rewrite ? raw.rewrite : local.rewrite,
  }
}

/**
 * Validate a task. Never rejects: any failure falls back to local rules.
 * opts: { now, coachUrl, fetchImpl, timeoutMs }
 */
export async function validateTask(task, opts = {}) {
  const { now = Date.now(), coachUrl = COACH_URL, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = opts
  const local = rulesCheck(task, now)
  if (!coachUrl) return local

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null
  try {
    const res = await fetchImpl(coachUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: {
          title: task.title,
          metric: task.metric,
          baseline: task.baseline,
          target: task.target,
          deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
          estimateH: task.estimateH,
          impact: task.impact,
          reach: task.reach,
          goal: task.goalLabel || task.goal,
          receiver: task.receiver,
        },
        now: new Date(now).toISOString(),
      }),
      signal: ctrl?.signal,
    })
    if (!res.ok) throw new Error(`Coach responded ${res.status}`)
    const out = normalizeRemote(await res.json(), local)
    if (!out) throw new Error('Coach reply had no score')
    return out
  } catch (err) {
    return { ...local, fellBack: true, reason: err?.name === 'AbortError' ? 'Coach timed out' : err?.message || 'Coach unreachable' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
