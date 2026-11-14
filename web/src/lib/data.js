// Sample data. No backend yet: everything lives in React state.
const H = 3600 * 1000
const DAY = 24 * H

export const GOALS = [
  { id: 'g-response', label: 'Cut support first-response time', metric: 'Median first response (hours)', unit: 'h', base: 6.5, target: 4 },
  { id: 'g-convert', label: 'Lift trial-to-paid conversion', metric: 'Trial-to-paid conversion (%)', unit: '%', base: 11, target: 14 },
  { id: 'g-infra', label: 'Reduce infrastructure spend', metric: 'Monthly cloud spend ($k)', unit: 'k', base: 48, target: 42 },
  { id: 'g-activate', label: 'Raise onboarding activation', metric: 'Week-1 activation (%)', unit: '%', base: 38, target: 46 },
  { id: 'g-nps', label: 'Improve customer NPS', metric: 'NPS score', unit: '', base: 31, target: 38 },
  { id: 'g-roadmap', label: 'Ship the Q4 roadmap', metric: 'Roadmap items shipped', unit: '', base: 3, target: 8 },
]
export const goalById = (id) => GOALS.find((g) => g.id === id)

export const PEOPLE = [
  { id: 'p-priya', name: 'Priya Nair', role: 'Support Operations', tone: '#f5a524', me: true },
  { id: 'p-marcus', name: 'Marcus Webb', role: 'Platform Engineering', tone: '#7fb8c4' },
  { id: 'p-aiko', name: 'Aiko Tanaka', role: 'Growth', tone: '#d98b6a' },
  { id: 'p-diego', name: 'Diego Alvarez', role: 'Finance Operations', tone: '#9bbf8a' },
]
export const ME = PEOPLE[0]
export const personById = (id) => PEOPLE.find((p) => p.id === id)
export const RECEIVER_SUGGESTIONS = ['Anil Kapoor', 'Sofia Reyes', 'Jonas Becker', 'Leila Haddad', 'Tom Okafor', 'Mei Lin']

let seq = 0
const nextId = () => `t-${++seq}`

/** Build one finished historic task. `now` anchors everything in the past. */
function done(now, owner, daysAgo, title, goalId, receiver, impact, reach, reply, est, act, o = {}) {
  const goal = goalById(goalId)
  const committedAt = now - daysAgo * DAY
  const deadline = committedAt + (est * 1.5 + 2) * H
  const doneAt = o.late ? deadline + 3 * H : deadline - 0.75 * H
  const jitter = (seq % 3) * 0.1
  const baseline = o.noBaseline ? null : +(goal.base * (1 + jitter * 0.1)).toFixed(1)
  const result = +(goal.target + (goal.base - goal.target) * (0.1 + jitter)).toFixed(1)
  return {
    id: nextId(), owner, title, goal: goalId, receiver, impact, reach,
    metric: goal.metric, baseline, target: goal.target, unit: goal.unit,
    estimateH: est, actualH: act, committedAt, startedAt: committedAt + H, deadline, doneAt,
    status: 'done', reply, result,
    proof: o.noProof ? '' : o.proof ?? 'Dashboard screenshot',
    reopened: Boolean(o.reopened), stillWorking: !o.broken, coach: 'rules',
  }
}

export function seedTasks(now = Date.now()) {
  seq = 0
  const P = 'p-priya', M = 'p-marcus', A = 'p-aiko', D = 'p-diego'
  const tasks = [
    // Priya: balanced, useful, mostly on time
    done(now, P, 1, 'Rewrite the refund macro so agents resolve billing tickets in one reply', 'g-response', 'Anil Kapoor', 'High', 'Customers', 'useful', 4, 4.5),
    done(now, P, 2, 'Route VIP tickets to a dedicated queue with a 1h SLA', 'g-response', 'Sofia Reyes', 'High', 'Customers', 'useful', 6, 7, { proof: 'Queue report' }),
    done(now, P, 3, 'Document the escalation path for payment disputes', 'g-nps', 'Leila Haddad', 'Medium', 'Team', 'partly', 3, 2.5),
    done(now, P, 4, 'Cut tag clutter from 60 to 25 helpdesk tags', 'g-response', 'Jonas Becker', 'Low', 'Team', 'useful', 2, 2.5, { proof: 'Helpdesk export' }),
    done(now, P, 6, 'Pilot weekend coverage rota for enterprise accounts', 'g-nps', 'Tom Okafor', 'Medium', 'Customers', 'useful', 8, 10, { late: true }),
    done(now, P, 8, 'Build the weekly backlog-age report for the support lead', 'g-response', 'Anil Kapoor', 'Medium', 'Team', 'partly', 5, 5, { noProof: true }),
    done(now, P, 9, 'Train 6 new agents on the returns workflow', 'g-activate', 'Mei Lin', 'Medium', 'Team', 'useful', 6, 5.5),
    // Marcus: lots of tasks, little value
    done(now, M, 1, 'Rotate staging credentials', 'g-infra', 'Jonas Becker', 'Low', 'Me', 'pending', 1, 1, { noProof: true, noBaseline: true }),
    done(now, M, 1, 'Tidy the CI config comments', 'g-roadmap', 'Sofia Reyes', 'Low', 'Me', 'partly', 1, 0.75, { noProof: true }),
    done(now, M, 2, 'Bump minor dependencies in the billing service', 'g-roadmap', 'Leila Haddad', 'Low', 'Team', 'partly', 2, 2.5),
    done(now, M, 2, 'Archive 40 stale feature branches', 'g-infra', 'Tom Okafor', 'Low', 'Me', 'pending', 1, 1, { noProof: true }),
    done(now, M, 3, 'Rename internal env vars to the new scheme', 'g-roadmap', 'Anil Kapoor', 'Low', 'Team', 'partly', 3, 3, { noProof: true }),
    done(now, M, 3, 'Fix flaky snapshot test in checkout', 'g-roadmap', 'Mei Lin', 'Low', 'Team', 'useful', 2, 2, { reopened: true }),
    done(now, M, 4, 'Update the on-call wiki page', 'g-nps', 'Sofia Reyes', 'Low', 'Me', 'pending', 1, 1.5, { noProof: true, noBaseline: true }),
    done(now, M, 5, 'Delete unused S3 buckets in the sandbox account', 'g-infra', 'Jonas Becker', 'Medium', 'Team', 'useful', 3, 3.5),
    done(now, M, 5, 'Add lint rule for unused exports', 'g-roadmap', 'Leila Haddad', 'Low', 'Team', 'partly', 2, 2.5, { noProof: true }),
    done(now, M, 6, 'Migrate the cron jobs to the new scheduler', 'g-roadmap', 'Tom Okafor', 'Medium', 'Team', 'partly', 6, 5, { reopened: true }),
    done(now, M, 7, 'Clean the README install steps', 'g-activate', 'Mei Lin', 'Low', 'Me', 'pending', 1, 1, { noProof: true }),
    done(now, M, 8, 'Pin base image versions', 'g-infra', 'Anil Kapoor', 'Low', 'Team', 'useful', 2, 2),
    done(now, M, 9, 'Reformat the Terraform modules', 'g-infra', 'Sofia Reyes', 'Low', 'Me', 'pending', 2, 2.5, { noProof: true }),
    // Aiko: few tasks, high value
    done(now, A, 1, 'Ship the pricing-page test with annual-plan default', 'g-convert', 'Anil Kapoor', 'High', 'Customers', 'useful', 8, 8.5, { proof: 'Experiment readout' }),
    done(now, A, 3, 'Add in-app checklist for first-week setup', 'g-activate', 'Sofia Reyes', 'High', 'Customers', 'useful', 10, 12, { proof: 'Funnel dashboard' }),
    done(now, A, 5, 'Launch win-back email to churned trials', 'g-convert', 'Jonas Becker', 'High', 'Customers', 'partly', 6, 6),
    done(now, A, 7, 'Fix signup form drop-off on mobile', 'g-activate', 'Tom Okafor', 'High', 'Customers', 'useful', 5, 4.5, { proof: 'Analytics report' }),
    done(now, A, 9, 'Interview 8 lapsed customers about pricing', 'g-nps', 'Leila Haddad', 'Medium', 'Team', 'useful', 8, 9, { late: true }),
    // Diego: steady, some misses
    done(now, D, 1, 'Automate the month-end accrual reconciliation', 'g-infra', 'Mei Lin', 'High', 'Team', 'useful', 8, 11, { late: true }),
    done(now, D, 2, 'Renegotiate the observability tooling contract', 'g-infra', 'Tom Okafor', 'High', 'Team', 'partly', 6, 4),
    done(now, D, 3, 'Publish the cloud cost allocation by team', 'g-infra', 'Jonas Becker', 'Medium', 'Team', 'not_useful', 5, 5, { reopened: true, broken: true }),
    done(now, D, 4, 'Cut unused SaaS seats across 5 vendors', 'g-infra', 'Sofia Reyes', 'Medium', 'Team', 'useful', 4, 5),
    done(now, D, 6, 'Draft expense policy changes for travel', 'g-nps', 'Anil Kapoor', 'Low', 'Team', 'not_useful', 3, 3.5, { reopened: true }),
    done(now, D, 7, 'Build the invoice-aging view for collections', 'g-convert', 'Leila Haddad', 'Medium', 'Team', 'useful', 6, 6, { noProof: true }),
    done(now, D, 8, 'Reconcile Q3 vendor credits', 'g-infra', 'Mei Lin', 'Low', 'Me', 'partly', 3, 3.5),
  ]
  // One open task already on Priya's board so the countdown rings are visible.
  const goal = goalById('g-response')
  tasks.push({
    id: nextId(), owner: P, title: 'Draft the refund-policy FAQ covering the top 10 ticket reasons',
    goal: goal.id, receiver: 'Sofia Reyes', impact: 'Medium', reach: 'Customers',
    metric: goal.metric, baseline: 6.5, target: 4, unit: 'h', estimateH: 3,
    committedAt: now - 2 * H, startedAt: now - 1.5 * H, deadline: now + 5 * H + 20 * 60 * 1000, doneAt: null,
    status: 'active', reply: 'pending', result: null, proof: '', reopened: false, stillWorking: true, coach: 'rules',
  })
  return tasks
}

export function seedFeed(now = Date.now()) {
  const M = 60 * 1000
  return [
    { id: 'f-1', at: now - 14 * M, personId: 'p-aiko', kind: 'done', text: 'finished "Fix signup form drop-off on mobile"', note: 'Analytics report attached' },
    { id: 'f-2', at: now - 41 * M, personId: 'p-marcus', kind: 'commit', text: 'committed "Pin base image versions"', note: 'Low impact, Team reach' },
    { id: 'f-3', at: now - 73 * M, personId: 'p-diego', kind: 'reply', text: 'got a reply on "Cut unused SaaS seats": Useful', note: '+6 value' },
  ]
}
