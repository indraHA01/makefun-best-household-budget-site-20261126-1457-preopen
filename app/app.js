// NestEgg — the household budget that starts at payday.
// One page, hash routes, no build step, no network: every view below
// reads the same state, so the dashboard, the envelopes and the reports
// can never disagree with each other.
import { SEED } from './data.js';
import {
  loadState, saveState, resetState, money, money0,
  totalIncome, totalSpent, spentByCategory, plannedTotal,
  savedToGoals, unpaidBills, upcomingBillsTotal, ruleSplit, insights,
} from './state.js';
import { drawDonut, drawTrend } from './charts.js';

let state = loadState();
const root = document.getElementById('view');
const spent = () => spentByCategory(state);

function esc(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function catName(id) {
  const cat = state.categories.find((c) => c.id === id);
  return cat ? cat.name : id;
}

function catColor(id) {
  const cat = state.categories.find((c) => c.id === id);
  return cat ? cat.color : '#8a8a7a';
}

function dayLabel(date) {
  const d = new Date(date + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function route() {
  const hash = location.hash.replace(/^#\/?/, '');
  const [page, param] = hash.split('/');
  return { page: page || 'dashboard', param };
}

function navLink(page, label) {
  const active = route().page === page;
  return `<a href="#/${page}" class="${active ? 'active' : ''}">${label}</a>`;
}

function shell(inner) {
  const income = totalIncome(state);
  const out = totalSpent(state);
  const left = income - out - savedToGoals(state);
  return `
  <header class="topbar">
    <div class="wrap topbar-inner">
      <a class="brand" href="#/dashboard"><span class="brand-mark">◍</span> NestEgg <span class="brand-sub">household budget</span></a>
      <nav class="mainnav">
        ${navLink('dashboard', 'Dashboard')}
        ${navLink('transactions', 'Transactions')}
        ${navLink('budget', 'Budget')}
        ${navLink('goals', 'Goals')}
        ${navLink('bills', 'Bills')}
        ${navLink('payday', 'Payday planner')}
        ${navLink('reports', 'Reports')}
      </nav>
      <div class="month-chip">${esc(state.month)} · ${money0(left)} left</div>
    </div>
  </header>
  <main class="wrap">${inner}</main>
  <footer class="wrap foot">
    <p><strong>NestEgg</strong> — the Alvarez household's budget, kept on this device only. Nothing leaves the browser; reset the demo data any time from the Dashboard.</p>
    <p class="foot-links"><a href="#/dashboard">Dashboard</a> · <a href="#/budget">Budget</a> · <a href="#/goals">Goals</a> · <a href="#/reports">Reports</a></p>
  </footer>`;
}

function statCard(label, value, sub, tone) {
  return `<div class="card stat ${tone || ''}">
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-sub">${sub}</div>
  </div>`;
}

function budgetBar(cat, amount) {
  const pct = cat.planned > 0 ? Math.min(100, (amount / cat.planned) * 100) : 0;
  const over = amount > cat.planned;
  return `<div class="bar-row">
    <div class="bar-head"><span><span class="dot" style="background:${cat.color}"></span>${esc(cat.name)}</span>
    <span>${money(amount)} of ${money0(cat.planned)}</span></div>
    <div class="bar"><div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%;background:${cat.color}"></div></div>
    <div class="bar-note">${over ? `${money(amount - cat.planned)} over plan` : `${money(cat.planned - amount)} left · ${Math.round(pct)}% used`}</div>
  </div>`;
}

function viewDashboard() {
  const income = totalIncome(state);
  const out = totalSpent(state);
  const saved = savedToGoals(state);
  const left = income - out - saved;
  const byCat = spent();
  const topCats = [...state.categories]
    .map((cat) => ({ ...cat, amount: byCat[cat.id] || 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  const due = unpaidBills(state);
  const rule = ruleSplit(state);
  return `
  <section class="hero">
    <div>
      <p class="kicker">${esc(state.household)} · ${esc(state.today)}</p>
      <h1>November, in one glance.</h1>
      <p class="lede">Payday money is already split into envelopes, the bills are marked, and
      ${money0(left)} is still unassigned. Here's exactly where the month stands.</p>
    </div>
    <div class="hero-actions">
      <a class="btn primary" href="#/transactions">+ Add spending</a>
      <a class="btn" href="#/payday">Plan the next payday</a>
    </div>
  </section>

  <section class="grid stats">
    ${statCard('Money in', money(income), '2 salaries + freelance, Nov 1–25', 'good')}
    ${statCard('Spent so far', money(out), `${state.transactions.length} purchases logged`, '')}
    ${statCard('Moved to goals', money(saved), 'Emergency fund + road trip', 'good')}
    ${statCard('Left to assign', money(left), '5 days left in November', left < 0 ? 'bad' : '')}
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h2>Where the money went</h2><a href="#/reports">Reports →</a></div>
      <canvas id="donut" class="donut" width="320" height="260" role="img" aria-label="Donut chart of spending by category"></canvas>
      <ul class="legend">
        ${topCats.map((cat) => `<li><span class="dot" style="background:${cat.color}"></span>${esc(cat.name)}<b>${money(cat.amount)}</b></li>`).join('')}
      </ul>
    </div>
    <div class="card">
      <div class="card-head"><h2>Envelopes this month</h2><a href="#/budget">Full budget →</a></div>
      ${[...state.categories].sort((a, b) => (byCat[b.id] || 0) - (byCat[a.id] || 0)).slice(0, 5).map((cat) => budgetBar(cat, byCat[cat.id] || 0)).join('')}
      <p class="card-note">Planned ${money0(plannedTotal(state))} across ${state.categories.length} envelopes; spent ${money0(out)} so far.</p>
    </div>
  </section>

  <section class="grid two">
    <div class="card">
      <div class="card-head"><h2>Latest spending</h2><a href="#/transactions">All transactions →</a></div>
      <ul class="tx-list">
        ${recent.map((t) => `<li><span class="tx-dot" style="background:${catColor(t.category)}"></span>
          <span class="tx-note">${esc(t.note)}</span>
          <span class="tx-cat">${esc(catName(t.category))} · ${dayLabel(t.date)}</span>
          <b>${money(t.amount)}</b></li>`).join('')}
      </ul>
    </div>
    <div class="stack">
      <div class="card">
        <div class="card-head"><h2>Bills still to pay</h2><a href="#/bills">All bills →</a></div>
        ${due.length === 0
          ? '<p class="card-note">Everything is paid for November. Nice work.</p>'
          : `<ul class="bill-list">${due.map((b) => `<li><span>${esc(b.name)}</span><span>due Nov ${b.due}</span><b>${money(b.amount)}</b></li>`).join('')}</ul>
             <p class="card-note">${money(upcomingBillsTotal(state))} still to go out before the month ends.</p>`}
      </div>
      <div class="card rule-card">
        <div class="card-head"><h2>The 50/30/20 check</h2><a href="#/reports">How it works →</a></div>
        <div class="rule-bar">
          <div style="width:${rule.needsPct}%;background:#1d4d3b" title="Needs"></div>
          <div style="width:${rule.wantsPct}%;background:#d96c3f" title="Wants"></div>
          <div style="width:${rule.savingsPct}%;background:#b3883c" title="Savings"></div>
        </div>
        <p class="card-note">Needs ${rule.needsPct.toFixed(0)}% · Wants ${rule.wantsPct.toFixed(0)}% · Savings ${rule.savingsPct.toFixed(0)}% of ${money0(income)} income. Target: 50 / 30 / 20.</p>
      </div>
    </div>
  </section>

  <section class="card">
    <div class="card-head"><h2>Reset the demo</h2></div>
    <p class="card-note">Made a mess testing the buttons? <button class="linklike" id="reset-demo">Reset all November data</button> puts the Alvarez household back to the figures above. Your edits live only in this browser.</p>
  </section>`;
}

function viewTransactions() {
  const cats = state.categories;
  const rows = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  return `
  <section class="page-head">
    <div><p class="kicker">Every dollar, accounted for</p><h1>Transactions</h1>
    <p class="lede">${rows.length} purchases in November, ${money(totalSpent(state))} in all. Add one, delete a mistake, or filter the list.</p></div>
  </section>
  <section class="card">
    <form id="add-tx" class="form-grid">
      <label>Date<input type="date" name="date" value="2026-11-25" required></label>
      <label>What was it?<input type="text" name="note" placeholder="e.g. GreenMart weekly shop" maxlength="80" required></label>
      <label>Envelope<select name="category">${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <label>Amount ($)<input type="number" name="amount" min="0.01" step="0.01" placeholder="0.00" required></label>
      <button class="btn primary" type="submit">Add spending</button>
    </form>
    <p class="form-msg" id="tx-msg" role="status"></p>
  </section>
  <section class="card">
    <div class="filter-row">
      <label>Envelope <select id="filter-cat"><option value="">All envelopes</option>${cats.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <label>Search <input type="search" id="filter-text" placeholder="Search notes…"></label>
      <button class="btn small" id="export-csv">Download CSV</button>
    </div>
    <div class="table-wrap"><table class="tx-table">
      <thead><tr><th>Date</th><th>What</th><th>Envelope</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody id="tx-body">
        ${rows.map((t) => `<tr data-cat="${t.category}" data-note="${esc(t.note.toLowerCase())}">
          <td>${dayLabel(t.date)}</td><td>${esc(t.note)}</td><td>${esc(catName(t.category))}</td>
          <td class="num">${money(t.amount)}</td>
          <td><button class="linklike danger" data-del="${t.id}">Delete</button></td></tr>`).join('')}
      </tbody>
    </table></div>
    <p class="card-note" id="tx-count">${rows.length} transactions · ${money(totalSpent(state))} total</p>
  </section>`;
}

function viewBudget() {
  const byCat = spent();
  const planned = plannedTotal(state);
  const out = totalSpent(state);
  return `
  <section class="page-head">
    <div><p class="kicker">Envelopes, not guesses</p><h1>The November budget</h1>
    <p class="lede">Each envelope holds the money for one part of household life. Spent ${money(out)} of the ${money0(planned)} planned — change any plan below and the whole site updates.</p></div>
  </section>
  <section class="grid stats">
    ${statCard('Planned', money0(planned), `${state.categories.length} envelopes`, '')}
    ${statCard('Spent', money(out), `${Math.round((out / planned) * 100)}% of the plan used`, '')}
    ${statCard('Still in envelopes', money(planned - out), 'Unspent plan, 5 days left', 'good')}
  </section>
  <section class="grid two-col-cards">
    ${state.categories.map((cat) => {
      const amount = byCat[cat.id] || 0;
      const pct = cat.planned > 0 ? Math.min(100, (amount / cat.planned) * 100) : 0;
      const over = amount > cat.planned;
      return `<article class="card envelope">
        <div class="env-head"><span class="env-icon" style="background:${cat.color}">${cat.icon}</span>
          <div><h2>${esc(cat.name)}</h2><p>${over ? 'Over plan' : `${money(cat.planned - amount)} left`}</p></div>
          <b class="env-amount">${money(amount)}</b></div>
        <div class="bar"><div class="bar-fill ${over ? 'over' : ''}" style="width:${pct}%;background:${cat.color}"></div></div>
        <div class="env-edit">
          <label>Plan <input type="number" min="0" step="5" value="${cat.planned}" data-plan="${cat.id}" aria-label="Planned amount for ${esc(cat.name)}"> $/month</label>
          <span class="env-pct">${Math.round(pct)}% used</span>
        </div>
      </article>`;
    }).join('')}
  </section>
  <section class="card">
    <div class="card-head"><h2>How envelopes work here</h2></div>
    <p class="card-note">On payday, every dollar of income is assigned to an envelope before it can be spent — that's the Payday planner's job. An envelope that runs dry borrows from another envelope, never from next month. Rent is fixed at ${money0(1450)}; groceries flex with the week; whatever is left in an envelope on the 30th sweeps to the emergency fund.</p>
  </section>`;
}

function viewGoals() {
  const saved = savedToGoals(state);
  return `
  <section class="page-head">
    <div><p class="kicker">Money with a job to do later</p><h1>Savings goals</h1>
    <p class="lede">${money(saved)} moved to goals in November. Each goal shows what is saved, what is left, and roughly when it lands at the current pace.</p></div>
  </section>
  <section class="grid two-col-cards">
    ${state.goals.map((goal) => {
      const pct = Math.min(100, Math.round((goal.saved / goal.target) * 100));
      const left = Math.max(0, goal.target - goal.saved);
      const monthsLeft = left > 0 ? Math.max(1, Math.ceil(left / 300)) : 0;
      return `<article class="card goal">
        <div class="card-head"><h2>${esc(goal.name)}</h2><span class="goal-pct">${pct}%</span></div>
        <p class="card-note">${esc(goal.note)}</p>
        <div class="bar big"><div class="bar-fill" style="width:${pct}%;background:${goal.color}"></div></div>
        <p class="goal-nums"><b>${money(goal.saved)}</b> saved of ${money0(goal.target)} · ${money(left)} to go${left > 0 ? ` · about ${monthsLeft} month${monthsLeft > 1 ? 's' : ''} at $300/mo` : ' · done!'}</p>
        <form class="goal-form" data-goal="${goal.id}">
          <label>Add to this goal $<input type="number" min="1" step="1" placeholder="50" required></label>
          <button class="btn small primary" type="submit">Add money</button>
        </form>
      </article>`;
    }).join('')}
  </section>
  <section class="card">
    <div class="card-head"><h2>Start a new goal</h2></div>
    <form id="add-goal" class="form-grid">
      <label>Goal name<input type="text" name="name" placeholder="e.g. New washing machine" maxlength="60" required></label>
      <label>Target ($)<input type="number" name="target" min="1" step="10" placeholder="800" required></label>
      <label>Already saved ($)<input type="number" name="saved" min="0" step="10" value="0"></label>
      <button class="btn primary" type="submit">Create goal</button>
    </form>
    <p class="form-msg" id="goal-msg" role="status"></p>
    <div class="card-head" style="margin-top:1.5rem"><h2>Moves this month</h2></div>
    <ul class="tx-list">
      ${state.goalMoves.map((m) => {
        const goal = state.goals.find((g) => g.id === m.goal);
        return `<li><span class="tx-dot" style="background:${goal ? goal.color : '#8a8a7a'}"></span>
          <span class="tx-note">${esc(m.note)}</span><span class="tx-cat">${goal ? esc(goal.name) : ''} · ${dayLabel(m.date)}</span><b>${money(m.amount)}</b></li>`;
      }).join('')}
    </ul>
  </section>`;
}

function viewBills() {
  const due = unpaidBills(state);
  const paid = state.bills.filter((b) => b.paid);
  const billRow = (b) => `<li class="bill-row ${b.paid ? 'paid' : ''}">
    <span class="bill-name">${esc(b.name)}<small>${esc(catName(b.category))} · due Nov ${b.due}</small></span>
    <b>${money(b.amount)}</b>
    <button class="btn small ${b.paid ? '' : 'primary'}" data-bill="${b.id}">${b.paid ? 'Paid ✓ — undo' : 'Mark paid'}</button>
  </li>`;
  return `
  <section class="page-head">
    <div><p class="kicker">Nothing slips through</p><h1>Bills</h1>
    <p class="lede">${due.length === 0 ? 'Every November bill is paid.' : `${money(upcomingBillsTotal(state))} still to pay across ${due.length} bills before the month ends.`} Tap a bill to mark it paid — the dashboard and the envelopes update at once.</p></div>
  </section>
  <section class="grid two">
    <div class="card">
      <div class="card-head"><h2>Still to pay</h2><span>${due.length} bills</span></div>
      ${due.length === 0 ? '<p class="card-note">All clear for November.</p>' : `<ul class="bill-list">${due.map(billRow).join('')}</ul>`}
    </div>
    <div class="card">
      <div class="card-head"><h2>Paid in November</h2><span>${paid.length} bills</span></div>
      ${paid.length === 0 ? '<p class="card-note">Nothing paid yet.</p>' : `<ul class="bill-list">${paid.map(billRow).join('')}</ul>`}
      <p class="card-note">Paid bills also appear as transactions in their envelope, so the budget always matches the bank.</p>
    </div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Add a recurring bill</h2></div>
    <form id="add-bill" class="form-grid">
      <label>Bill name<input type="text" name="name" placeholder="e.g. Car insurance" maxlength="60" required></label>
      <label>Amount ($)<input type="number" name="amount" min="0.01" step="0.01" placeholder="0.00" required></label>
      <label>Due day<input type="number" name="due" min="1" max="31" value="15" required></label>
      <label>Envelope<select name="category">${state.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <button class="btn primary" type="submit">Add bill</button>
    </form>
    <p class="form-msg" id="bill-msg" role="status"></p>
  </section>`;
}

function viewPayday() {
  const planned = plannedTotal(state);
  const income = totalIncome(state);
  const split = state.categories.map((cat) => ({
    ...cat, share: planned > 0 ? cat.planned / planned : 0,
  }));
  return `
  <section class="page-head">
    <div><p class="kicker">The NestEgg way — split it before you spend it</p><h1>Payday planner</h1>
    <p class="lede">Type in the next paycheck and see it split across the envelopes, in the same proportions as the November plan. Nothing is spent before it has an envelope.</p></div>
  </section>
  <section class="grid two">
    <div class="card">
      <div class="card-head"><h2>Next paycheck</h2></div>
      <form id="payday-form" class="form-grid single">
        <label>Paycheck amount ($)<input type="number" id="paycheck" min="1" step="10" value="2300" required></label>
        <label>Payday<input type="date" id="payday-date" value="2026-12-01"></label>
        <button class="btn primary" type="submit">Split this paycheck</button>
      </form>
      <p class="form-msg" id="payday-msg" role="status"></p>
      <p class="card-note">The split below follows the November plan: ${money0(planned)} planned across ${state.categories.length} envelopes, plus the goal habit of ${money0(450)} per paycheck.</p>
    </div>
    <div class="card">
      <div class="card-head"><h2>Where it goes</h2><span id="split-total">${money(2300)}</span></div>
      <ul class="legend" id="split-list">
        ${split.map((cat) => `<li><span class="dot" style="background:${cat.color}"></span>${esc(cat.name)}<b data-split="${cat.id}">${money(2300 * cat.share)}</b></li>`).join('')}
        <li><span class="dot" style="background:#b3883c"></span>Savings goals<b id="split-goals">${money(450)}</b></li>
      </ul>
      <p class="card-note" id="split-note">Goals get a fixed ${money(450)} per paycheck; the rest splits by envelope share. Rent takes the biggest slice — ${money(2300 * (1450 / planned))} of this check.</p>
      <button class="btn" id="apply-split">Use this split as December's plan</button>
      <p class="form-msg" id="apply-msg" role="status"></p>
    </div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Why payday, not month-end?</h2></div>
    <p class="card-note">Most budgets fail because the money is counted after it is gone. NestEgg flips it: the moment a paycheck lands, every dollar gets an envelope. If groceries run short in week three, the envelope borrows from Fun — visibly, on the Budget page — instead of quietly eating next month's rent.</p>
  </section>`;
}

function viewReports() {
  const byCat = spent();
  const rule = ruleSplit(state);
  const notes = insights(state);
  const topCats = [...state.categories]
    .map((cat) => ({ ...cat, amount: byCat[cat.id] || 0 }))
    .sort((a, b) => b.amount - a.amount);
  return `
  <section class="page-head">
    <div><p class="kicker">Six months of evidence</p><h1>Reports</h1>
    <p class="lede">November is the sixth month the Alvarez household has kept every receipt. The trend is the point: spending is down while income holds steady.</p></div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Income vs spending — Jun to Nov</h2><span>Monthly totals</span></div>
    <canvas id="trend" class="trend" width="900" height="300" role="img" aria-label="Bar chart of income versus spending, June to November"></canvas>
    <p class="card-note">November spending (${money(totalSpent(state))}) is the lowest of the six months — the envelope habit is working. Average monthly saving over the six months: ${money0((state.history.reduce((s, m) => s + (m.income - m.spent), 0)) / 6)}.</p>
  </section>
  <section class="grid two">
    <div class="card">
      <div class="card-head"><h2>The 50/30/20 rule</h2><span>November</span></div>
      <div class="rule-bar big">
        <div style="width:${rule.needsPct}%;background:#1d4d3b"></div>
        <div style="width:${rule.wantsPct}%;background:#d96c3f"></div>
        <div style="width:${rule.savingsPct}%;background:#b3883c"></div>
        <div style="width:${rule.unassignedPct}%;background:#d8cfc0"></div>
      </div>
      <ul class="legend">
        <li><span class="dot" style="background:#1d4d3b"></span>Needs — ${money(rule.needs)} · ${rule.needsPct.toFixed(0)}% <em>(target 50%)</em></li>
        <li><span class="dot" style="background:#d96c3f"></span>Wants — ${money(rule.wants)} · ${rule.wantsPct.toFixed(0)}% <em>(target 30%)</em></li>
        <li><span class="dot" style="background:#b3883c"></span>Savings — ${money(rule.savings)} · ${rule.savingsPct.toFixed(0)}% <em>(target 20%)</em></li>
        <li><span class="dot" style="background:#d8cfc0"></span>Not yet assigned — ${money(rule.unassigned)} · ${rule.unassignedPct.toFixed(0)}%</li>
      </ul>
      <p class="card-note">Needs sit on the line; wants are well under. The ${money(rule.unassigned)} not yet assigned is the household's choice to make — sweep it to the emergency fund, or give the envelopes a little more room in December.</p>
    </div>
    <div class="card">
      <div class="card-head"><h2>What November says</h2></div>
      <ul class="insight-list">
        ${notes.map((n) => `<li class="insight ${n.tone}">${esc(n.text)}</li>`).join('')}
      </ul>
    </div>
  </section>
  <section class="card">
    <div class="card-head"><h2>Spending by envelope</h2><span>November, largest first</span></div>
    ${topCats.map((cat) => budgetBar(cat, cat.amount)).join('')}
  </section>`;
}

const VIEWS = {
  dashboard: viewDashboard,
  transactions: viewTransactions,
  budget: viewBudget,
  goals: viewGoals,
  bills: viewBills,
  payday: viewPayday,
  reports: viewReports,
};

function afterRender(page) {
  if (page === 'dashboard') {
    const donut = document.getElementById('donut');
    if (donut) {
      const byCat = spent();
      drawDonut(donut, state.categories
        .map((cat) => ({ value: byCat[cat.id] || 0, color: cat.color }))
        .filter((s) => s.value > 0));
    }
    const reset = document.getElementById('reset-demo');
    if (reset) reset.addEventListener('click', () => {
      state = resetState();
      saveState(state);
      render();
    });
  }
  if (page === 'reports') {
    const trend = document.getElementById('trend');
    if (trend) drawTrend(trend, state.history);
  }
  if (page === 'transactions') wireTransactions();
  if (page === 'budget') wireBudget();
  if (page === 'goals') wireGoals();
  if (page === 'bills') wireBills();
  if (page === 'payday') wirePayday();
}

function wireTransactions() {
  const form = document.getElementById('add-tx');
  const msg = document.getElementById('tx-msg');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const amount = Number(data.get('amount'));
    if (!amount || amount <= 0) { msg.textContent = 'Enter an amount above $0.'; return; }
    state.transactions.push({
      id: 't' + Date.now(),
      date: String(data.get('date') || '2026-11-25'),
      category: String(data.get('category')),
      note: String(data.get('note')).trim(),
      amount,
    });
    saveState(state);
    msg.textContent = `Added ${money(amount)} to ${catName(String(data.get('category')))}.`;
    render();
  });
  const applyFilter = () => {
    const cat = document.getElementById('filter-cat').value;
    const text = document.getElementById('filter-text').value.trim().toLowerCase();
    let shown = 0, total = 0;
    document.querySelectorAll('#tx-body tr').forEach((row) => {
      const ok = (!cat || row.dataset.cat === cat) && (!text || row.dataset.note.includes(text));
      row.style.display = ok ? '' : 'none';
      if (ok) { shown += 1; total += Number(row.querySelector('.num').textContent.replace(/[$,]/g, '')); }
    });
    document.getElementById('tx-count').textContent = `${shown} transactions shown · ${money(total)} total`;
  };
  document.getElementById('filter-cat').addEventListener('change', applyFilter);
  document.getElementById('filter-text').addEventListener('input', applyFilter);
  document.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => {
    state.transactions = state.transactions.filter((t) => t.id !== btn.dataset.del);
    saveState(state);
    render();
  }));
  document.getElementById('export-csv').addEventListener('click', () => {
    const lines = [['date', 'note', 'envelope', 'amount']];
    for (const t of [...state.transactions].sort((a, b) => a.date.localeCompare(b.date))) {
      lines.push([t.date, `"${t.note.replace(/"/g, '""')}"`, catName(t.category), t.amount.toFixed(2)]);
    }
    const blob = new Blob([lines.map((row) => row.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'nestegg-november-2026.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

function wireBudget() {
  document.querySelectorAll('[data-plan]').forEach((input) => input.addEventListener('change', () => {
    const value = Math.max(0, Number(input.value) || 0);
    const cat = state.categories.find((c) => c.id === input.dataset.plan);
    if (cat) {
      cat.planned = value;
      saveState(state);
      render();
    }
  }));
}

function wireGoals() {
  document.querySelectorAll('.goal-form').forEach((form) => form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = Number(new FormData(form).get('amount') || form.querySelector('input').value);
    const goal = state.goals.find((g) => g.id === form.dataset.goal);
    if (!goal || !amount || amount <= 0) return;
    goal.saved += amount;
    state.goalMoves.push({ date: '2026-11-25', goal: goal.id, amount, note: 'Added by hand — 25 Nov' });
    saveState(state);
    render();
  }));
  const form = document.getElementById('add-goal');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    state.goals.push({
      id: 'g' + Date.now(),
      name: String(data.get('name')).trim(),
      note: 'A new goal, started today.',
      target: Number(data.get('target')),
      saved: Number(data.get('saved')) || 0,
      color: '#6b5b95',
    });
    saveState(state);
    document.getElementById('goal-msg').textContent = 'Goal created — it now has its own envelope on this page.';
    render();
  });
}

function wireBills() {
  document.querySelectorAll('[data-bill]').forEach((btn) => btn.addEventListener('click', () => {
    const bill = state.bills.find((b) => b.id === btn.dataset.bill);
    if (!bill) return;
    bill.paid = !bill.paid;
    if (bill.paid && !state.transactions.some((t) => t.note === bill.name && t.date >= '2026-11-25')) {
      state.transactions.push({
        id: 't' + Date.now(), date: '2026-11-25', category: bill.category,
        note: bill.name, amount: bill.amount,
      });
    }
    saveState(state);
    render();
  }));
  const form = document.getElementById('add-bill');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    state.bills.push({
      id: 'b' + Date.now(),
      name: String(data.get('name')).trim(),
      amount: Number(data.get('amount')),
      due: Number(data.get('due')),
      category: String(data.get('category')),
      paid: false,
    });
    saveState(state);
    document.getElementById('bill-msg').textContent = 'Bill added — it shows in "Still to pay" above.';
    render();
  });
}

function wirePayday() {
  const paycheckInput = document.getElementById('paycheck');
  const planned = plannedTotal(state);
  const updateSplit = () => {
    const amount = Number(paycheckInput.value) || 0;
    const goalSlice = 450;
    const rest = Math.max(0, amount - goalSlice);
    document.getElementById('split-total').textContent = money(amount);
    document.getElementById('split-goals').textContent = money(goalSlice);
    state.categories.forEach((cat) => {
      const el = document.querySelector(`[data-split="${cat.id}"]`);
      if (el) el.textContent = money(rest * (planned > 0 ? cat.planned / planned : 0));
    });
    document.getElementById('split-note').textContent =
      `Goals get a fixed ${money(goalSlice)} per paycheck; the rest splits by envelope share. Rent takes the biggest slice — ${money(rest * (1450 / planned))} of this check.`;
  };
  document.getElementById('payday-form').addEventListener('submit', (e) => {
    e.preventDefault();
    updateSplit();
    document.getElementById('payday-msg').textContent = 'Split updated — every dollar of this paycheck now has an envelope.';
  });
  paycheckInput.addEventListener('input', updateSplit);
  document.getElementById('apply-split').addEventListener('click', () => {
    const amount = Number(paycheckInput.value) || 0;
    if (amount <= 0) return;
    const goalSlice = 450;
    const rest = Math.max(0, amount - goalSlice);
    state.categories.forEach((cat) => {
      cat.planned = Math.round(rest * (planned > 0 ? cat.planned / planned : 0));
    });
    saveState(state);
    document.getElementById('apply-msg').textContent = "Done — December's envelopes now follow this split. See them on the Budget page.";
  });
}

function render() {
  const { page } = route();
  const view = VIEWS[page] || viewDashboard;
  root.innerHTML = shell(view());
  document.querySelectorAll('.mainnav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === `#/${page}`);
  });
  afterRender(page);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();
