import { describe, expect, it, vi } from 'vitest'
import { rulesCheck, validateTask } from './validate.js'
import { addWorkingHours, workingHoursBetween } from './time.js'

// Wednesday 12 Nov 2025, 10:00 local time.
const NOW = new Date(2025, 10, 12, 10, 0, 0).getTime()
const good = {
  title: 'Cut first response time on billing tickets with a one-reply macro',
  metric: 'Median first response (hours)', baseline: '6.5', target: '4',
  deadline: new Date(2025, 10, 13, 15, 0).getTime(), estimateH: 3,
  impact: 'High', reach: 'Customers', goal: 'g-response', goalLabel: 'Cut support first-response time', receiver: 'Anil Kapoor',
}
const status = (r, id) => r.checks.find((c) => c.id === id).status

describe('working hours', () => {
  it('counts only Mon-Fri 9-18', () => {
    expect(workingHoursBetween(new Date(2025, 10, 12, 10), new Date(2025, 10, 12, 12))).toBe(2)
    expect(workingHoursBetween(new Date(2025, 10, 12, 17), new Date(2025, 10, 13, 10))).toBe(2) // 1h + 1h
    expect(workingHoursBetween(new Date(2025, 10, 14, 16), new Date(2025, 10, 17, 10))).toBe(3) // Fri 2h + Mon 1h
    expect(workingHoursBetween(new Date(2025, 10, 15, 9), new Date(2025, 10, 16, 18))).toBe(0) // weekend
  })
  it('addWorkingHours skips nights and weekends', () => {
    const d = addWorkingHours(new Date(2025, 10, 14, 16), 3) // Fri 16:00 + 3h -> Mon 10:00
    expect([d.getDay(), d.getHours()]).toEqual([1, 10])
  })
})

describe('rulesCheck', () => {
  it('passes a well-formed task', () => {
    const r = rulesCheck(good, NOW)
    expect(r.checks.map((c) => c.status)).toEqual(['pass', 'pass', 'pass', 'pass', 'pass'])
    expect(r.score).toBe(100)
    expect(r.label).toBe('Rules preview')
  })
  it('fails a vague, empty task', () => {
    const r = rulesCheck({ title: 'work on stuff', estimateH: 6, deadline: NOW + 3600e3, impact: 'High', reach: 'Me', receiver: 'team' }, NOW)
    expect(status(r, 'outcome')).toBe('warn')
    expect(status(r, 'metric')).toBe('fail')
    expect(status(r, 'deadline')).toBe('fail') // 1h away, 6h estimate
    expect(status(r, 'receiver')).toBe('warn')
    expect(status(r, 'goal')).toBe('fail')
    expect(r.score).toBeLessThan(35)
    expect(r.fixes.length).toBe(5)
  })
  it('flags a deadline in the past and a deadline outside working hours', () => {
    expect(status(rulesCheck({ ...good, deadline: NOW - 1 }, NOW), 'deadline')).toBe('fail')
    expect(status(rulesCheck({ ...good, deadline: new Date(2025, 10, 13, 20).getTime() }, NOW), 'deadline')).toBe('warn')
  })
  it('warns when the buffer is thin', () => {
    expect(status(rulesCheck({ ...good, estimateH: 6, deadline: new Date(2025, 10, 12, 17).getTime() }, NOW), 'deadline')).toBe('warn')
  })
  it('rejects the author as receiver', () => {
    expect(status(rulesCheck({ ...good, receiver: 'me' }, NOW), 'receiver')).toBe('fail')
  })
  it('builds the rewrite only from the inputs', () => {
    const r = rulesCheck(good, NOW)
    expect(r.rewrite).toContain('Median first response (hours) from 6.5 to 4')
    expect(r.rewrite).toContain('Anil Kapoor')
    const empty = rulesCheck({}, NOW)
    expect(empty.rewrite).toContain('‹baseline›')
    expect(empty.rewrite).toContain('‹receiver›')
  })
})

describe('validateTask', () => {
  it('uses local rules when no coach URL is set', async () => {
    const fetchImpl = vi.fn()
    const r = await validateTask(good, { now: NOW, coachUrl: '', fetchImpl })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(r.source).toBe('rules')
    expect(r.label).toBe('Rules preview')
  })
  it('POSTs the task and shows the coach reply', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ score: 71, verdict: 'Nearly.', fixes: ['Name a number.'], rewrite: 'Do it better.' }) }))
    const r = await validateTask(good, { now: NOW, coachUrl: 'https://coach.test/v', fetchImpl })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://coach.test/v')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).task.receiver).toBe('Anil Kapoor')
    expect(r).toMatchObject({ source: 'coach', label: 'Outcome Coach', score: 71, verdict: 'Nearly.', rewrite: 'Do it better.', fixes: ['Name a number.'] })
    expect(r.checks.length).toBe(5) // filled from local rules
  })
  it.each([
    ['network error', () => Promise.reject(new Error('offline'))],
    ['http 500', () => Promise.resolve({ ok: false, status: 500, json: async () => ({}) })],
    ['no score', () => Promise.resolve({ ok: true, json: async () => ({ hello: 1 }) })],
    ['bad json', () => Promise.resolve({ ok: true, json: async () => { throw new Error('bad json') } })],
  ])('falls back to Rules preview on %s', async (_n, impl) => {
    const r = await validateTask(good, { now: NOW, coachUrl: 'https://coach.test/v', fetchImpl: impl })
    expect(r.source).toBe('rules')
    expect(r.label).toBe('Rules preview')
    expect(r.fellBack).toBe(true)
  })
})
