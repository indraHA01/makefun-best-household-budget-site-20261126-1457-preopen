// NestEgg store — one small state module. It loads the seed from data.js,
// keeps the household's live copy in localStorage, and answers every
// question the pages ask: totals, per-category spend, the 50/30/20 split.
import { SEED } from './data.js';

const KEY = 'nestegg-nov-2026-v1';

function freshState() {
  return JSON.parse(JSON.stringify(SEED));
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch (e) { /* a bad save never breaks the site — fall back to seed */ }
  const state = freshState();
  saveState(state);
  return state;
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full — the page still works for this visit */ }
}

export function resetState() {
  localStorage.removeItem(KEY);
  return loadState();
}

export const money = (n) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money0 = (n) =>
  '$' + Math.round(Number(n)).toLocaleString('en-US');

export function totalIncome(state) {
  return state.income.reduce((sum, row) => sum + row.amount, 0);
}

export function totalSpent(state) {
  return state.transactions.reduce((sum, row) => sum + row.amount, 0);
}

export function spentByCategory(state) {
  const out = {};
  for (const cat of state.categories) out[cat.id] = 0;
  for (const row of state.transactions) {
    if (out[row.category] !== undefined) out[row.category] += row.amount;
  }
  return out;
}

export function plannedTotal(state) {
  return state.categories.reduce((sum, cat) => sum + cat.planned, 0);
}

export function savedToGoals(state) {
  return state.goalMoves.reduce((sum, move) => sum + move.amount, 0);
}

export function unpaidBills(state) {
  return state.bills.filter((bill) => !bill.paid);
}

export function upcomingBillsTotal(state) {
  return unpaidBills(state).reduce((sum, bill) => sum + bill.amount, 0);
}

// The 50/30/20 rule, grouped the way most households actually live it:
// needs = housing, groceries, utilities, transport, kids, health;
// wants = dining out, fun, clothing, everything else; savings = goal moves.
const NEEDS = ['housing', 'groceries', 'utilities', 'transport', 'kids', 'health'];
const WANTS = ['dining', 'fun', 'clothing', 'other'];

export function ruleSplit(state) {
  const spent = spentByCategory(state);
  const income = totalIncome(state);
  const needs = NEEDS.reduce((sum, id) => sum + (spent[id] || 0), 0);
  const wants = WANTS.reduce((sum, id) => sum + (spent[id] || 0), 0);
  const savings = savedToGoals(state);
  const unassigned = Math.max(0, income - needs - wants - savings);
  const pct = (n) => (income > 0 ? (n / income) * 100 : 0);
  return {
    income,
    needs, wants, savings, unassigned,
    needsPct: pct(needs), wantsPct: pct(wants),
    savingsPct: pct(savings), unassignedPct: pct(unassigned),
  };
}

export function insights(state) {
  const spent = spentByCategory(state);
  const income = totalIncome(state);
  const notes = [];
  const over = state.categories
    .filter((cat) => spent[cat.id] > cat.planned)
    .sort((a, b) => (spent[b.id] - b.planned) - (spent[a.id] - a.planned));
  const under = state.categories
    .filter((cat) => spent[cat.id] < cat.planned * 0.6 && cat.planned >= 150)
    .sort((a, b) => (a.planned - spent[a.id]) - (b.planned - spent[b.id]));
  if (over.length === 0) {
    notes.push({ tone: 'good', text: `Every envelope is inside its plan with five days left in the month — nothing is over budget.` });
  } else {
    for (const cat of over) {
      notes.push({ tone: 'warn', text: `${cat.name} is ${money(spent[cat.id] - cat.planned)} over its ${money0(cat.planned)} plan. Move money from a quiet envelope or trim the last five days.` });
    }
  }
  const rule = ruleSplit(state);
  if (rule.needsPct <= 52) {
    notes.push({ tone: 'good', text: `Needs are ${rule.needsPct.toFixed(0)}% of income — right on the 50% line for the 50/30/20 rule.` });
  } else {
    notes.push({ tone: 'warn', text: `Needs take ${rule.needsPct.toFixed(0)}% of income, above the 50% line. Housing is the biggest lever.` });
  }
  if (rule.savingsPct >= 15) {
    notes.push({ tone: 'good', text: `You have already moved ${money0(rule.savings)} (${rule.savingsPct.toFixed(0)}%) to savings goals this month — ahead of the 20% target pace.` });
  }
  for (const cat of under.slice(0, 2)) {
    notes.push({ tone: 'info', text: `${cat.name} has ${money(cat.planned - spent[cat.id])} still sitting in its envelope. Sweep it to the emergency fund on payday.` });
  }
  const daily = (income - totalSpent(state)) / 5;
  notes.push({ tone: 'info', text: `At the current pace you can spend about ${money(daily)} a day for the last five days and still finish the month in the black.` });
  return notes;
}
