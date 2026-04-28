import { state, deleteIncome, deleteRecurringExpense, deleteTransaction, deleteAccount, setTab, setLogsLimit, deleteCategory, deleteGoal, contributeToGoal } from './state.js';
import { updateChart, updateInsightsChart } from './chart.js';

const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function renderDashboard() {
  // Tabs View Switcher
  const viewDash = document.getElementById('view-dashboard');
  const viewInsights = document.getElementById('view-insights');
  const viewGoals = document.getElementById('view-goals');
  const viewLogs = document.getElementById('view-logs');
  
  const tabDash = document.getElementById('tab-dashboard');
  const tabInsights = document.getElementById('tab-insights');
  const tabGoals = document.getElementById('tab-goals');
  const tabLogs = document.getElementById('tab-logs');
  
  viewDash.style.display = state.activeTab === 'dashboard' ? 'block' : 'none';
  viewInsights.style.display = state.activeTab === 'insights' ? 'block' : 'none';
  if (viewGoals) viewGoals.style.display = state.activeTab === 'goals' ? 'block' : 'none';
  viewLogs.style.display = state.activeTab === 'logs' ? 'block' : 'none';

  tabDash.classList.toggle('active', state.activeTab === 'dashboard');
  tabInsights.classList.toggle('active', state.activeTab === 'insights');
  if (tabGoals) tabGoals.classList.toggle('active', state.activeTab === 'goals');
  if (tabLogs) tabLogs.classList.toggle('active', state.activeTab === 'logs');

  // Calculate sums
  const totalIncome = state.incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPlanned = state.recurringExpenses.reduce((acc, curr) => acc + curr.expected_amount, 0);
  const totalSpent = state.transactions.reduce((acc, curr) => acc + curr.amount, 0);

  // Global Net Worth
  let totalAssets = 0;
  let totalLiabilities = 0;
  state.accounts.forEach(acc => {
    if (acc.type === 'asset') totalAssets += acc.balance;
    if (acc.type === 'liability') totalLiabilities += acc.balance;
  });
  
  const netWorth = totalAssets - totalLiabilities;
  document.getElementById('global-net-worth').textContent = formatter.format(netWorth);

  const safeToSpend = netWorth - totalPlanned;

  // Update DOM text
  document.getElementById('total-income').textContent = formatter.format(totalIncome);
  document.getElementById('total-expenses').textContent = formatter.format(totalSpent);
  const safeEl = document.getElementById('safe-to-spend');
  safeEl.textContent = formatter.format(safeToSpend);
  safeEl.style.color = safeToSpend < 0 ? '#FFA0A0' : 'white';

  // Render sub-components
  renderMiniLists();
  renderTransactions();
  updateSelectOptions();
  renderCategories();
  renderLogs();
  renderBudgetProgress();
  renderGoals();
  
  // Charts
  updateChart(state.transactions);
  
  if (state.activeTab === 'insights') {
    updateInsightsChart(totalIncome, totalSpent);
    const savingsEl = document.getElementById('savings-rate-metric');
    if (totalIncome > 0) {
      const rate = ((totalIncome - totalSpent) / totalIncome) * 100;
      savingsEl.textContent = `Savings Rate: ${rate.toFixed(1)}%`;
      savingsEl.style.color = rate >= 15 ? 'var(--color-accent)' : 'var(--color-text-muted)';
    } else {
      savingsEl.textContent = `No income set for this month.`;
    }
  }
}

function updateSelectOptions() {
  const accSelects = [
    document.getElementById('account-id'),
    document.getElementById('income-account-id'),
    document.getElementById('transfer-from'),
    document.getElementById('transfer-to')
  ];
  
  accSelects.forEach(sel => {
    if(!sel) return;
    const currentVal = sel.value;
    const isRequired = sel.id === 'transfer-from' || sel.id === 'transfer-to';
    sel.innerHTML = isRequired ? '<option value="" disabled selected>Select Account</option>' : '<option value="">(None)</option>';
    state.accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = `${acc.name} (${formatter.format(acc.balance)})`;
      sel.appendChild(opt);
    });
    // restore value safely
    if (Array.from(sel.options).some(o => o.value == currentVal)) {
      sel.value = currentVal;
    }
  });
}

export function renderCategories() {
  const catSelect = document.getElementById('category');
  if (catSelect) {
    const currentVal = catSelect.value;
    catSelect.innerHTML = '<option value="" disabled selected>Select category</option>';
    state.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    });
    if (Array.from(catSelect.options).some(o => o.value == currentVal)) {
      catSelect.value = currentVal;
    }
  }

  const listEl = document.getElementById('category-list');
  if (listEl) {
    listEl.innerHTML = '';
    state.categories.forEach(c => {
      const div = document.createElement('div');
      div.className = 'mini-item';
      div.innerHTML = `<span>${c.name} ${c.monthly_budget > 0 ? `<small style="color:var(--color-text-muted);">(${formatter.format(c.monthly_budget)})</small>` : ''}</span>
        <button class="mini-item-delete" data-id="${c.id}">×</button>`;
      listEl.appendChild(div);
    });
    listEl.querySelectorAll('.mini-item-delete').forEach(b => {
      b.onclick = (e) => deleteCategory(e.target.dataset.id);
    });
  }
}

function renderLogs() {
  const c = document.getElementById('logs-container');
  if(!c) return;
  c.innerHTML = '';
  if(!state.logs || state.logs.length === 0) { 
    c.innerHTML = '<p style="color:var(--color-text-muted); padding:1rem;">No logs found.</p>'; 
    return; 
  }
  
  state.logs.forEach(log => {
    const div = document.createElement('div');
    div.className = 'log-item';
    const dStr = new Date(log.timestamp).toLocaleString();
    div.innerHTML = `
      <div class="log-meta">
        <span class="tag" style="background:var(--color-bg); font-weight:600;">${log.action}</span>
        <span style="color:var(--color-text-muted); font-size:0.75rem;">${dStr}</span>
      </div>
      <div class="log-msg" style="font-size:0.95rem; margin-top:0.25rem;">${log.message}</div>
    `;
    c.appendChild(div);
  });
}

function renderMiniLists() {
  const incomeList = document.getElementById('income-list');
  incomeList.innerHTML = '';
  state.incomes.forEach(inc => {
    const div = document.createElement('div');
    div.className = 'mini-item';
    div.innerHTML = `<span>${inc.source_name}</span>
      <span>${formatter.format(inc.amount)} <button class="mini-item-delete" data-id="${inc.id}">×</button></span>`;
    incomeList.appendChild(div);
  });

  const recList = document.getElementById('recurring-list');
  recList.innerHTML = '';
  state.recurringExpenses.forEach(rec => {
    const div = document.createElement('div');
    div.className = 'mini-item';
    div.innerHTML = `<span>${rec.name}</span>
      <span>${formatter.format(rec.expected_amount)} <button class="mini-item-delete" data-id="${rec.id}">×</button></span>`;
    recList.appendChild(div);
  });

  const accList = document.getElementById('accounts-list');
  if(accList) {
    accList.innerHTML = '';
    state.accounts.forEach(acc => {
       const div = document.createElement('div');
       div.className = 'mini-item';
       const color = acc.type === 'asset' ? 'var(--color-accent)' : 'var(--color-danger)';
       let label = acc.type === 'asset' ? 'Asset' : 'Liability';
       div.innerHTML = `
         <div style="display:flex; flex-direction:column;">
           <span>${acc.name}</span>
           <small style="font-size:0.75rem; color:var(--color-text-muted)">${label}</small>
         </div>
         <span><strong style="color:${color}">${formatter.format(acc.balance)}</strong> <button class="mini-item-delete" data-id="${acc.id}">×</button></span>
       `;
       accList.appendChild(div);
    });
  }

  // Attach handlers
  document.querySelectorAll('#income-list .mini-item-delete').forEach(b => b.onclick = (e) => deleteIncome(e.target.dataset.id));
  document.querySelectorAll('#recurring-list .mini-item-delete').forEach(b => b.onclick = (e) => deleteRecurringExpense(e.target.dataset.id));
  document.querySelectorAll('#accounts-list .mini-item-delete').forEach(b => b.onclick = (e) => deleteAccount(e.target.dataset.id));
}

function renderTransactions() {
  const listEl = document.getElementById('transaction-list');
  listEl.innerHTML = '';
  
  let filtered = state.transactions;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(t => 
      (t.description && t.description.toLowerCase().includes(q)) ||
      (t.category && t.category.toLowerCase().includes(q)) ||
      (t.amount.toString().includes(q))
    );
  }

  if (filtered.length === 0) {
    listEl.innerHTML = '<p style="color: var(--color-text-muted);">No transactions found.</p>';
    return;
  }
  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach(exp => {
    const item = document.createElement('div');
    item.className = 'transaction-item';
    const dStr = new Date(exp.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
    let accName = '';
    if (exp.account_id) {
       const a = state.accounts.find(x => x.id == exp.account_id);
       if (a) accName = `from ${a.name}`;
    }
    item.innerHTML = `
      <div class="transaction-info">
        <div class="transaction-title">${exp.description || 'Expense'}</div>
        <div class="transaction-meta">
          <span class="tag">${exp.category}</span>
          <span>${dStr}</span>
          <span style="font-style:italic; font-size:0.75rem;">${accName}</span>
        </div>
      </div>
      <div class="transaction-amount">
        -${formatter.format(exp.amount)}
        <button class="mini-item-delete transaction-del" data-id="${exp.id}" title="Delete">×</button>
      </div>
    `;
    listEl.appendChild(item);
  });

  listEl.querySelectorAll('.transaction-del').forEach(b => b.onclick = (e) => deleteTransaction(e.target.dataset.id));
}

function renderBudgetProgress() {
  const container = document.getElementById('budget-progress-list');
  if (!container) return;
  container.innerHTML = '';

  const categoriesWithBudget = state.categories.filter(c => c.monthly_budget > 0);
  if (categoriesWithBudget.length === 0) {
    container.innerHTML = '<p style="color:var(--color-text-muted);">No budgets set.</p>';
    return;
  }

  const spentPerCat = {};
  state.transactions.forEach(t => {
    spentPerCat[t.category] = (spentPerCat[t.category] || 0) + t.amount;
  });

  categoriesWithBudget.forEach(c => {
    const spent = spentPerCat[c.name] || 0;
    const percent = Math.min(100, (spent / c.monthly_budget) * 100);
    const color = percent >= 100 ? 'var(--color-danger)' : 'var(--color-accent)';

    const html = `
      <div style="display:flex; flex-direction:column; gap:0.25rem;">
        <div style="display:flex; justify-content:space-between; font-size:0.875rem;">
          <span style="font-weight:500;">${c.name}</span>
          <span style="color:var(--color-text-muted);">${formatter.format(spent)} / ${formatter.format(c.monthly_budget)}</span>
        </div>
        <div style="background:var(--color-bg); height:8px; border-radius:4px; overflow:hidden;">
          <div style="background:${color}; height:100%; width:${percent}%;"></div>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = html;
    container.appendChild(div);
  });
}

export function renderGoals() {
  const listEl = document.getElementById('goals-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  if (!state.goals || state.goals.length === 0) {
    listEl.innerHTML = '<p style="color: var(--color-text-muted); grid-column: span 2;">No savings goals yet. Create one!</p>';
    return;
  }

  state.goals.forEach(goal => {
    const percent = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
    const div = document.createElement('div');
    div.className = 'card glass';
    div.style.padding = '1.25rem';
    
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
        <h4 style="margin:0; font-size:1.1rem; border:none; padding:0;">${goal.name}</h4>
        <button class="text-button goal-del-btn" data-id="${goal.id}" style="position:static; padding:0; color:var(--color-danger);">Delete</button>
      </div>
      <div style="color:var(--color-text-muted); font-size:0.85rem; margin-bottom:1rem;">
        ${formatter.format(goal.current_amount)} of ${formatter.format(goal.target_amount)}
      </div>
      <div style="background:var(--color-bg); height:12px; border-radius:6px; overflow:hidden; margin-bottom:1rem;">
        <div style="background:var(--color-accent); height:100%; width:${percent}%; transition:width 0.5s;"></div>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <input type="number" id="contribute-input-${goal.id}" placeholder="Amount" style="width:80px; padding:0.4rem; font-size:0.85rem;">
        <button class="primary-btn contribute-btn" data-id="${goal.id}" style="padding:0.4rem 0.8rem; font-size:0.85rem;">Add Funds</button>
      </div>
    `;
    listEl.appendChild(div);
  });

  listEl.querySelectorAll('.goal-del-btn').forEach(b => {
    b.onclick = (e) => deleteGoal(e.target.dataset.id);
  });
  listEl.querySelectorAll('.contribute-btn').forEach(b => {
    b.onclick = (e) => {
      const id = e.target.dataset.id;
      const input = document.getElementById(`contribute-input-${id}`);
      const amt = parseFloat(input.value);
      if (!isNaN(amt) && amt > 0) {
        contributeToGoal(id, amt);
      }
    };
  });
}
