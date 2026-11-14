import { describe, expect, it } from 'vitest'
import { estimateAccuracy, measurability, measurabilityOf, quality, reliability, sayDoRatio, taskValue, value } from './scoring.js'

const H = 3600 * 1000
const NOW = 1_000_000_000_000
const done = (o = {}) => ({
  status: 'done', impact: 'High', reach: 'Customers', reply: 'useful', estimateH: 4, actualH: 4,
  deadline: NOW, doneAt: NOW - H, proof: 'x', baseline: 6, result: 4, goal: 'g', reopened: false, stillWorking: true, ...o,
})

describe('value', () => {
  it('multiplies impact x reach x reply', () => {
    expect(taskValue(done())).toBe(10) // 5 x 2 x 1
    expect(taskValue(done({ impact: 'Medium', reach: 'Team', reply: 'partly' }))).toBe(2.25) // 3 x 1.5 x 0.5
    expect(taskValue(done({ impact: 'Low', reach: 'Me', reply: 'pending' }))).toBe(0.5)
    expect(taskValue(done({ reply: 'not_useful' }))).toBe(0)
  })
  it('ignores unfinished tasks and sums the rest', () => {
    expect(taskValue(done({ status: 'active' }))).toBe(0)
    expect(value([done(), done({ impact: 'Low', reach: 'Me' }), done({ status: 'planned' })])).toBe(11)
  })
})

describe('reliability', () => {
  it('say/do counts only due tasks finished on time', () => {
    const tasks = [
      done(), // on time
      done({ doneAt: NOW + H }), // late
      { status: 'active', deadline: NOW - H }, // overdue, due
      { status: 'planned', deadline: NOW + 5 * H }, // not due yet
    ]
    expect(sayDoRatio(tasks, NOW)).toBeCloseTo(1 / 3)
  })
  it('estimate accuracy is min/max averaged over finished tasks', () => {
    expect(estimateAccuracy([done({ estimateH: 4, actualH: 8 }), done({ estimateH: 6, actualH: 6 })])).toBeCloseTo(0.75)
  })
  it('is 100 x (0.5 sayDo + 0.5 accuracy)', () => {
    const r = reliability([done({ estimateH: 4, actualH: 8 }), done({ estimateH: 6, actualH: 6 })], NOW)
    expect(r.score).toBeCloseTo(100 * (0.5 * 1 + 0.5 * 0.75))
  })
  it('is 0 with no data', () => expect(reliability([], NOW).score).toBe(0))
})

describe('quality', () => {
  it('averages share not reopened and share still working', () => {
    const q = quality([done(), done({ reopened: true }), done({ stillWorking: false }), done()])
    expect(q.notReopened).toBe(0.75)
    expect(q.stillWorking).toBe(0.75)
    expect(q.score).toBe(75)
  })
})

describe('measurability', () => {
  it('gives 25 points for each of the four parts', () => {
    expect(measurabilityOf(done()).score).toBe(100)
    expect(measurabilityOf(done({ proof: '' })).score).toBe(75)
    expect(measurabilityOf(done({ baseline: null })).score).toBe(75)
    expect(measurabilityOf(done({ reply: 'pending' })).score).toBe(75)
    expect(measurabilityOf(done({ goal: null, proof: ' ' })).score).toBe(50)
  })
  it('averages over finished tasks', () => {
    expect(measurability([done(), done({ proof: '', goal: null }), { status: 'active' }]).score).toBe(75)
  })
})
