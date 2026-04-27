export const state = {
  currentDate: new Date(),
  incomes: [],
  recurringExpenses: [],
  transactions: [],
  accounts: [],
  logs: [],
  logsLimit: 50,
  activeTab: 'dashboard'
};

const listeners = [];
export function subscribe(listener) { listeners.push(listener); }
function notify() { listeners.forEach(l => l()); }

export async function fetchState() {
  const month = state.currentDate.getMonth() + 1;
  const year = state.currentDate.getFullYear();

  const [incomesRes, recurringRes, transactionsRes, accountsRes, logsRes] = await Promise.all([
    fetch(`/api/incomes?month=${month}&year=${year}`),
    fetch('/api/recurring'),
    fetch(`/api/transactions?month=${month}&year=${year}`),
    fetch('/api/accounts'),
    fetch(`/api/logs?limit=${state.logsLimit}`)
  ]);

  if (incomesRes.ok) state.incomes = await incomesRes.json();
  if (recurringRes.ok) state.recurringExpenses = await recurringRes.json();
  if (transactionsRes.ok) state.transactions = await transactionsRes.json();
  if (accountsRes.ok) state.accounts = await accountsRes.json();
  if (logsRes.ok) state.logs = await logsRes.json();
  
  notify();
}

export async function addAccount(accountData) {
  await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData)
  });
  await fetchState();
}

export async function submitTransfer(transferData) {
  await fetch('/api/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData)
  });
  await fetchState();
}

export async function addIncome(incomeData) {
  const month = state.currentDate.getMonth() + 1;
  const year = state.currentDate.getFullYear();
  await fetch('/api/incomes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...incomeData, month, year })
  });
  await fetchState();
}

export async function addRecurringExpense(expenseData) {
  await fetch('/api/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData)
  });
  await fetchState();
}

export async function addTransaction(transactionData) {
  const date = state.currentDate;
  const isoDate = new Date(date.getFullYear(), date.getMonth(), new Date().getDate(), new Date().getHours(), new Date().getMinutes()).toISOString();
  await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...transactionData, date: isoDate })
  });
  await fetchState();
}

export async function deleteTransaction(id) {
  await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function deleteIncome(id) {
  await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function deleteRecurringExpense(id) {
  await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function deleteAccount(id) {
  await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
  await fetchState();
}

export function setDate(year, month) {
  state.currentDate = new Date(year, month, 1);
  fetchState();
}

export function setTab(tab) {
  state.activeTab = tab;
  notify();
}

export function setLogsLimit(limit) {
  state.logsLimit = limit;
  fetchState();
}
