import { createContext, useContext, useMemo, useReducer } from 'react'
import { ME, goalById, seedFeed, seedTasks } from '../lib/data.js'
import { fmtWhen } from '../lib/time.js'
import { taskValue } from '../lib/scoring.js'

const LedgerContext = createContext(null)

export const REPLY_LABEL = { pending: 'Pending', useful: 'Useful', partly: 'Partly useful', not_useful: 'Not useful' }

const fmtVal = (n) => `${n >= 0 ? '+' : ''}${Math.round(n * 10) / 10}`

function reducer(state, action) {
  const { now } = action
  switch (action.type) {
    case 'commit': {
      const t = action.task
      const ev = {
        id: `f-${t.id}-c`, at: now, personId: t.owner, kind: 'commit',
        text: `committed "${t.title}"`,
        note: `${t.impact} impact, ${t.reach} reach, due ${fmtWhen(t.deadline)}`,
      }
      return { ...state, tasks: [...state.tasks, t], feed: [ev, ...state.feed].slice(0, 40) }
    }
    case 'start': {
      return { ...state, tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, status: 'active', startedAt: now } : t)) }
    }
    case 'done': {
      let ev = null
      const tasks = state.tasks.map((t) => {
        if (t.id !== action.id) return t
        const next = {
          ...t, status: 'done', doneAt: now, today: true, startedAt: t.startedAt ?? now,
          actualH: action.actualH, result: action.result, proof: action.proof, reply: 'pending',
        }
        ev = {
          id: `f-${t.id}-d`, at: now, personId: t.owner, kind: 'done',
          text: `finished "${t.title}"`,
          note: `Result ${action.result}${t.unit ? ' ' + t.unit : ''}, ${action.actualH}h vs ${t.estimateH}h estimate${action.proof ? ', proof: ' + action.proof : ', no proof yet'}. Waiting for ${t.receiver} on M91`,
        }
        return next
      })
      return { ...state, tasks, feed: ev ? [ev, ...state.feed].slice(0, 40) : state.feed }
    }
    case 'reply': {
      let ev = null
      const tasks = state.tasks.map((t) => {
        if (t.id !== action.id || t.status !== 'done') return t
        const before = taskValue(t)
        // A "Not useful" reply sends the work back: it counts as reopened.
        const next = { ...t, reply: action.reply, reopened: action.reply === 'not_useful' ? true : false }
        const delta = taskValue(next) - before
        ev = {
          id: `f-${t.id}-r-${now}`, at: now, personId: t.owner, kind: 'reply',
          text: `got a reply from ${t.receiver} on "${t.title}": ${REPLY_LABEL[action.reply]}`,
          note: action.reply === 'pending' ? 'Reply withdrawn (demo)' : `${fmtVal(delta)} value`,
        }
        return next
      })
      return { ...state, tasks, feed: ev ? [ev, ...state.feed].slice(0, 40) : state.feed }
    }
    default:
      return state
  }
}

function init() {
  const now = Date.now()
  return { tasks: seedTasks(now), feed: seedFeed(now) }
}

export function LedgerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const api = useMemo(
    () => ({
      commitTask(form, coach) {
        const now = Date.now()
        const goal = goalById(form.goal)
        const task = {
          id: `t-${now}-${Math.random().toString(36).slice(2, 6)}`,
          owner: ME.id, title: form.title.trim(), goal: form.goal || null,
          receiver: form.receiver.trim(), impact: form.impact, reach: form.reach,
          metric: form.metric.trim(), baseline: form.baselineNum, target: form.targetNum,
          unit: form.unit || goal?.unit || '', estimateH: Number(form.estimateH),
          committedAt: now, startedAt: null, deadline: form.deadline, doneAt: null,
          status: 'planned', reply: 'pending', result: null, proof: '',
          reopened: false, stillWorking: true,
          coach: coach?.source ?? null, coachScore: coach?.score ?? null,
        }
        dispatch({ type: 'commit', task, now })
        return task
      },
      startTask: (id) => dispatch({ type: 'start', id, now: Date.now() }),
      finishTask: (id, data) => dispatch({ type: 'done', id, now: Date.now(), ...data }),
      setReply: (id, reply) => dispatch({ type: 'reply', id, reply, now: Date.now() }),
    }),
    [],
  )
  return <LedgerContext.Provider value={{ ...state, ...api }}>{children}</LedgerContext.Provider>
}

export const useLedger = () => useContext(LedgerContext)
