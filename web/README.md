# Outcome Ledger (web)

A daily task manager that measures value delivered, not tasks closed.
React + Vite + Tailwind CSS v4 + Framer Motion. No backend: sample data, state in React.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm test           # scoring, working-hours and validation tests
npm run build
```

## Two views

- **My Day**: task form, live 0-100 check, "Ask the Outcome Coach", commit to a board with countdown rings,
  Start / Mark done (actual hours, result, proof label), then "Waiting for <receiver> on M91".
  The **Demo** box on a finished task simulates the receiver replying Useful / Partly / Not useful.
- **Manager View**: person switcher, four score rings, tasks-closed vs value chart (with table view),
  expandable outcome ledger, and a live feed of everything committed or finished in My Day.

## Outcome Coach (`src/lib/validate.js`)

`validateTask(task)` is the single entry point. With `VITE_COACH_URL` set it POSTs
`{ task, now }` as JSON and expects `{ score, verdict?, checks?, fixes?, rewrite? }`
(optionally wrapped in `{ result }`). Missing optional fields are filled from the local rules.
With the URL empty, or on any failure (network, non-2xx, timeout after 8s, no numeric score) it
runs the local rules and labels the result **Rules preview**.

```bash
cp .env.example .env          # .env is git-ignored
npm run mock-coach            # optional stand-in server on :8787
# then set VITE_COACH_URL=http://localhost:8787 in .env and restart `npm run dev`
```

`VITE_*` values are bundled into the browser build. Never put a secret there; keep keys on your own server.

## Scoring (`src/lib/scoring.js`, fixed formulas, never AI-set)

- **Value** = Σ over finished tasks of impact (High 5, Medium 3, Low 1) × reach (Me 1, Team 1.5, Customers 2) × reply (Useful 1, Partly 0.5, Pending 0.5, Not useful 0).
- **Reliability** = 100 × (0.5 × say/do + 0.5 × estimate accuracy). Say/do = finished-on-time ÷ tasks that are due (finished, or past deadline). Estimate accuracy = mean of min(est, actual) ÷ max(est, actual).
- **Quality** = 100 × (0.5 × share not reopened + 0.5 × share still working). A "Not useful" reply marks the task reopened.
- **Measurability** = average over finished tasks, 25 points each for: proof, baseline and result, receiver replied, goal linked.

The Value ring is drawn against a fixed 60-point benchmark (`VALUE_BENCHMARK` in `Manager.jsx`).

## Motion

Canvas flow field (reacts to the cursor, pulses on validation), headline reveals, spotlight cards,
magnetic buttons, sliding view switch, count-ups, self-drawing rings, particle burst on confirmed value.
`prefers-reduced-motion` turns the field into a still frame and removes the beam, burst, magnet and slides.
