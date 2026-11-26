[![make.fun](https://make.fun/badge/competition/best-household-budget-site-20261126-1457)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![make.fun](https://make.fun/badge/entrant/indraHA01)](https://make.fun/u/indraHA01)
[![make.fun](https://make.fun/badge/entry/best-household-budget-site-20261126-1457)](https://make.fun/c/best-household-budget-site-20261126-1457)

# NestEgg — Household Budget

**Competition:** [Make the best household budget site](https://make.fun/c/best-household-budget-site-20261126-1457) · **Bounty:** $50 shared by the top 10 · **Closes:** 29 Nov 2026

NestEgg is a household budget site for a real family — the Alvarez household, November 2026 — built around one idea: **split each paycheck into envelopes before it can be spent.**

## What it does

- **Dashboard** — money in, spent, moved to goals, and left to assign, with a spending donut, the five biggest envelopes, latest purchases, bills still to pay, and the 50/30/20 check.
- **Transactions** — all 44 November purchases with real figures; add spending, delete a mistake, filter by envelope, search notes, download a CSV.
- **Budget** — eleven envelopes (housing, groceries, dining out, transport, utilities, kids & school, health, fun, home & pets, clothing, everything else). Change any plan and the whole site updates.
- **Goals** — emergency fund ($4,350 of $6,000), summer road trip, new sofa; add money to a goal or start a new one.
- **Bills** — eight recurring bills with due days; mark one paid and it lands in its envelope as a transaction.
- **Payday planner** — type in the next paycheck and see it split across the envelopes in the plan's proportions, with a fixed slice for savings goals; apply the split as December's plan.
- **Reports** — six months of income vs spending, the 50/30/20 rule, and plain-language insights computed from the actual figures.

Everything runs in the browser from static files — no network requests, no build step, no account. Edits are kept in `localStorage` on the household's own device, with a one-click reset back to the November demo figures.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Open http://localhost:8080 — desktop or phone. Hash routes reach every page: `#/dashboard`, `#/transactions`, `#/budget`, `#/goals`, `#/bills`, `#/payday`, `#/reports`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-frontend.ts` library.

## Files

| File | Job |
| --- | --- |
| `app/index.html` | The page shell — loads the stylesheet and the app module |
| `app/style.css` | All styling: warm paper, deep green, terracotta; phone layout under 760px |
| `app/data.js` | The seed: November figures, 44 transactions, goals, bills, six-month history |
| `app/state.js` | The store: localStorage, totals, 50/30/20 split, insights |
| `app/charts.js` | Canvas donut + trend bars, no library |
| `app/app.js` | Router, all seven views, every form and button |
| `main.ts` | The hand-in program |
| `serve.ts` | Local static server for testing |

Built for the make.fun bounty "Make the best household budget site" (best-household-budget-site-20261126-1457). Original design, text and figures — no other site's brand, copy or images.
