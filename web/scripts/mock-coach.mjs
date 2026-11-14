// Tiny stand-in for an Outcome Coach so you can try the VITE_COACH_URL path.
//   npm run mock-coach            -> http://localhost:8787
//   echo VITE_COACH_URL=http://localhost:8787 > .env   (then restart `npm run dev`)
// It only echoes a simple judgement; replace it with your real service.
import { createServer } from 'node:http'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

createServer((req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end()
  if (req.method !== 'POST') return res.writeHead(405, cors).end()
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    let task = {}
    try { task = JSON.parse(body).task ?? {} } catch { return res.writeHead(400, cors).end() }
    const hasNumbers = /\d/.test(task.baseline ?? '') && /\d/.test(task.target ?? '')
    const score = 40 + (task.title?.split(/\s+/).length > 5 ? 20 : 0) + (hasNumbers ? 25 : 0) + (task.receiver ? 10 : 0)
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      score,
      verdict: score >= 80 ? 'Mock coach says: ship it.' : 'Mock coach says: tighten the metric first.',
      fixes: hasNumbers ? [] : ['Give both a baseline and a target number.'],
      rewrite: `${task.title}. Measured by ${task.metric || 'a named metric'} for ${task.receiver || 'a named receiver'}.`,
    }))
  })
}).listen(8787, () => console.log('Mock coach on http://localhost:8787'))
