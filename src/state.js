export const state = {
  currentDate: new Date(),
  incomes: [],
  recurringExpenses: [],
  transactions: [],
  accounts: [],
  categories: [],
  goals: [],
  logs: [],
  logsLimit: 50,
  activeTab: 'dashboard',
  searchQuery: ''
};

export let token = localStorage.getItem('token') || null;

export function isAuthenticated() {
  return token !== null;
}

export function logout() {
  token = null;
  localStorage.removeItem('token');
  window.location.reload();
}

export function getUsername() {
  if (!token) return 'Seraf';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || 'Seraf';
  } catch (e) {
    return 'Seraf';
  }
}

export async function login(username, password) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if(res.ok) {
      const data = await res.json();
      token = data.token;
      localStorage.setItem('token', token);
      return { success: true };
    }
    const err = await res.json();
    return { success: false, error: err.error || "Login failed" };
  } catch (e) {
    return { success: false, error: "Network error or invalid response" };
  }
}

export async function register(username, password) {
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if(res.ok) return { success: true };
    const err = await res.json();
    return { success: false, error: err.error || "Registration failed" };
  } catch (e) {
    return { success: false, error: "Network error or invalid response" };
  }
}

async function authFetch(url, options = {}) {
  if (!options.headers) options.headers = {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) {
    logout();
  }
  return res;
}

const listeners = [];
export function subscribe(listener) { listeners.push(listener); }
function notify() { listeners.forEach(l => l()); }

export async function fetchState() {
  if (!isAuthenticated()) return;
  const month = state.currentDate.getMonth() + 1;
  const year = state.currentDate.getFullYear();

  const [incomesRes, recurringRes, transactionsRes, accountsRes, categoriesRes, logsRes, goalsRes] = await Promise.all([
    authFetch(`/api/incomes?month=${month}&year=${year}`),
    authFetch('/api/recurring'),
    authFetch(`/api/transactions?month=${month}&year=${year}`),
    authFetch('/api/accounts'),
    authFetch('/api/categories'),
    authFetch(`/api/logs?limit=${state.logsLimit}`),
    authFetch('/api/goals')
  ]);

  if (incomesRes && incomesRes.ok) state.incomes = await incomesRes.json();
  if (recurringRes && recurringRes.ok) state.recurringExpenses = await recurringRes.json();
  if (transactionsRes && transactionsRes.ok) state.transactions = await transactionsRes.json();
  if (accountsRes && accountsRes.ok) state.accounts = await accountsRes.json();
  if (categoriesRes && categoriesRes.ok) state.categories = await categoriesRes.json();
  if (logsRes && logsRes.ok) state.logs = await logsRes.json();
  if (goalsRes && goalsRes.ok) state.goals = await goalsRes.json();
  
  notify();
}

export async function addAccount(accountData) {
  await authFetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accountData)
  });
  await fetchState();
}

export async function submitTransfer(transferData) {
  await authFetch('/api/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferData)
  });
  await fetchState();
}

export async function addIncome(incomeData) {
  const month = state.currentDate.getMonth() + 1;
  const year = state.currentDate.getFullYear();
  await authFetch('/api/incomes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...incomeData, month, year })
  });
  await fetchState();
}

export async function addRecurringExpense(expenseData) {
  await authFetch('/api/recurring', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expenseData)
  });
  await fetchState();
}

export async function addTransaction(transactionData) {
  const date = state.currentDate;
  const isoDate = new Date(date.getFullYear(), date.getMonth(), new Date().getDate(), new Date().getHours(), new Date().getMinutes()).toISOString();
  await authFetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...transactionData, date: isoDate })
  });
  await fetchState();
}

export async function deleteTransaction(id) {
  await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function deleteIncome(id) {
  await authFetch(`/api/incomes/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function deleteRecurringExpense(id) {
  await authFetch(`/api/recurring/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function deleteAccount(id) {
  await authFetch(`/api/accounts/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function addCategory(name, monthly_budget = 0) {
  await authFetch('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, monthly_budget })
  });
  await fetchState();
}

export async function deleteCategory(id) {
  await authFetch(`/api/categories/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function addGoal(goalData) {
  await authFetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goalData)
  });
  await fetchState();
}

export async function contributeToGoal(id, amount) {
  await authFetch(`/api/goals/${id}/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  await fetchState();
}

export async function deleteGoal(id) {
  await authFetch(`/api/goals/${id}`, { method: 'DELETE' });
  await fetchState();
}

export async function updateCategoryBudget(id, monthly_budget) {
  await authFetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monthly_budget })
  });
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

export function setSearchQuery(query) {
  state.searchQuery = query;
  notify();
}

export function setLogsLimit(limit) {
  state.logsLimit = limit;
  fetchState();
}
