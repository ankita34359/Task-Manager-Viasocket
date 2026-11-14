// Fixed scoring formulas. Nothing here is ever set by AI: the coach may judge
// how well a task is written, but value, reliability, quality and
// measurability are pure functions of the ledger.
//
// A task is "finished" when status === 'done'. Fields used:
//   impact 'Low'|'Medium'|'High'      reach 'Me'|'Team'|'Customers'
//   reply  'pending'|'useful'|'partly'|'not_useful'
//   deadline, doneAt (ms)             estimateH, actualH (hours)
//   proof (string)   baseline, result (numbers)   goal (id)
//   reopened, stillWorking (booleans)

export const IMPACT_POINTS = { High: 5, Medium: 3, Low: 1 }
export const REACH_MULTIPLIER = { Me: 1, Team: 1.5, Customers: 2 }
export const REPLY_FACTOR = { useful: 1, partly: 0.5, pending: 0.5, not_useful: 0 }

export const isFinished = (t) => t.status === 'done'
const finished = (tasks) => tasks.filter(isFinished)
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const num = (v) => typeof v === 'number' && Number.isFinite(v)

/** Value points one task contributes (0 until it is finished). */
export function taskValue(t) {
  if (!isFinished(t)) return 0
  const impact = IMPACT_POINTS[t.impact] ?? 0
  const reach = REACH_MULTIPLIER[t.reach] ?? 1
  const reply = REPLY_FACTOR[t.reply] ?? REPLY_FACTOR.pending
  return impact * reach * reply
}

/** Value = sum over finished tasks of impact x reach x receiver reply. */
export function value(tasks) {
  return finished(tasks).reduce((sum, t) => sum + taskValue(t), 0)
}

/**
 * Say/do ratio: of the tasks that are due (finished, or past their deadline),
 * the share that were finished on or before their deadline.
 */
export function sayDoRatio(tasks, now = Date.now()) {
  const due = tasks.filter((t) => isFinished(t) || t.deadline <= now)
  if (!due.length) return 0
  const onTime = due.filter((t) => isFinished(t) && t.doneAt <= t.deadline).length
  return onTime / due.length
}

/** Estimate accuracy: mean of min(est, actual) / max(est, actual) over finished tasks. */
export function estimateAccuracy(tasks) {
  const ratios = finished(tasks)
    .filter((t) => t.estimateH > 0 && t.actualH > 0)
    .map((t) => Math.min(t.estimateH, t.actualH) / Math.max(t.estimateH, t.actualH))
  return avg(ratios)
}

/** Reliability = 100 x (0.5 x say/do ratio + 0.5 x estimate accuracy). */
export function reliability(tasks, now = Date.now()) {
  const sayDo = sayDoRatio(tasks, now)
  const accuracy = estimateAccuracy(tasks)
  return { score: 100 * (0.5 * sayDo + 0.5 * accuracy), sayDo, accuracy }
}

/** Quality = 100 x (0.5 x share not reopened + 0.5 x share still working). */
export function quality(tasks) {
  const done = finished(tasks)
  if (!done.length) return { score: 0, notReopened: 0, stillWorking: 0 }
  const notReopened = done.filter((t) => !t.reopened).length / done.length
  const stillWorking = done.filter((t) => t.stillWorking !== false).length / done.length
  return { score: 100 * (0.5 * notReopened + 0.5 * stillWorking), notReopened, stillWorking }
}

/** Points for one task: 25 each for proof, baseline + result, receiver replied, goal linked. */
export function measurabilityOf(t) {
  const parts = {
    proof: Boolean(t.proof && String(t.proof).trim()),
    baselineAndResult: num(t.baseline) && num(t.result),
    replied: t.reply !== undefined && t.reply !== 'pending',
    goal: Boolean(t.goal),
  }
  const score = Object.values(parts).filter(Boolean).length * 25
  return { score, parts }
}

/** Measurability Index = average of measurabilityOf over finished tasks. */
export function measurability(tasks) {
  const done = finished(tasks)
  return {
    score: avg(done.map((t) => measurabilityOf(t).score)),
    parts: {
      proof: avg(done.map((t) => (measurabilityOf(t).parts.proof ? 1 : 0))),
      baselineAndResult: avg(done.map((t) => (measurabilityOf(t).parts.baselineAndResult ? 1 : 0))),
      replied: avg(done.map((t) => (measurabilityOf(t).parts.replied ? 1 : 0))),
      goal: avg(done.map((t) => (measurabilityOf(t).parts.goal ? 1 : 0))),
    },
  }
}

export function summarize(tasks, now = Date.now()) {
  return {
    closed: finished(tasks).length,
    committed: tasks.length,
    value: value(tasks),
    reliability: reliability(tasks, now),
    quality: quality(tasks),
    measurability: measurability(tasks),
  }
}
