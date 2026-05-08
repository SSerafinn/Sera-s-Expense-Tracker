import './style.css';
import { state, subscribe, fetchState, addIncome, addRecurringExpense, addTransaction, addAccount, submitTransfer, setDate, setTab, setLogsLimit, setSearchQuery, addCategory, addGoal, isAuthenticated, login, register, logout } from './state.js';
import { renderDashboard } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const authContainer = document.getElementById('auth-container');
  const appContainer = document.getElementById('app-container');

  if (!isAuthenticated()) {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
  } else {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    subscribe(renderDashboard);
    await fetchState();
  }

  // Auth Logic
  let isLoginMode = true;
  const authForm = document.getElementById('auth-form');
  const authTitle = document.getElementById('auth-title');
  const authToggleLink = document.getElementById('auth-toggle-link');
  const authError = document.getElementById('auth-error');

  if (authToggleLink) {
    authToggleLink.onclick = (e) => {
      e.preventDefault();
      isLoginMode = !isLoginMode;
      authTitle.textContent = isLoginMode ? 'Login' : 'Register';
      authToggleLink.textContent = isLoginMode ? 'Need an account? Register' : 'Already have an account? Login';
      authError.textContent = '';
    };
  }

  if (authForm) {
    authForm.onsubmit = async (e) => {
      e.preventDefault();
      const username = document.getElementById('auth-username').value;
      const password = document.getElementById('auth-password').value;
      authError.textContent = '';

      if (isLoginMode) {
        const res = await login(username, password);
        if (res.success) {
          window.location.reload();
        } else {
          authError.style.color = 'var(--color-danger)';
          authError.textContent = res.error;
        }
      } else {
        const res = await register(username, password);
        if (res.success) {
          authError.style.color = 'var(--color-accent)';
          authError.textContent = 'Registration successful! You can now log in.';
          isLoginMode = true;
          authTitle.textContent = 'Login';
          authToggleLink.textContent = 'Need an account? Register';
          authForm.reset();
        } else {
          authError.style.color = 'var(--color-danger)';
          authError.textContent = res.error;
        }
      }
    };
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = logout;
  }

  // Theme Setup
  const themeToggle = document.getElementById('theme-toggle');
  
  const iconSun = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
  const iconMoon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

  if (themeToggle) {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggle.innerHTML = iconSun;
    } else {
      themeToggle.innerHTML = iconMoon;
    }

    themeToggle.onclick = () => {
      if (document.documentElement.getAttribute('data-theme') === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = iconMoon;
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = iconSun;
      }
    };
  }

  // Navigation
  document.getElementById('tab-dashboard').onclick = () => setTab('dashboard');
  document.getElementById('tab-insights').onclick = () => setTab('insights');
  const tabGoals = document.getElementById('tab-goals');
  if (tabGoals) tabGoals.onclick = () => setTab('goals');
  const tabLogs = document.getElementById('tab-logs');
  if (tabLogs) tabLogs.onclick = () => setTab('logs');

  // Logs Limit selector
  const limitSelect = document.getElementById('logs-limit');
  if (limitSelect) {
    limitSelect.onchange = (e) => setLogsLimit(parseInt(e.target.value));
  }

  // Month Picker
  const monthPicker = document.getElementById('month-picker');
  const now = state.currentDate;
  monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  monthPicker.addEventListener('change', (e) => {
    const [year, month] = e.target.value.split('-');
    setDate(year, parseInt(month) - 1);
  });

  // Search
  const searchInput = document.getElementById('transaction-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => setSearchQuery(e.target.value));
  }

  // Transfer Modal
  const transferDialog = document.getElementById('transfer-dialog');
  const transferBtn = document.getElementById('transfer-btn');
  const qaTransfer = document.getElementById('qa-transfer');
  if (transferDialog) {
    if (transferBtn) transferBtn.onclick = () => transferDialog.showModal();
    if (qaTransfer) qaTransfer.onclick = () => transferDialog.showModal();
    document.getElementById('cancel-transfer').onclick = () => transferDialog.close();
    
    document.getElementById('transfer-form').onsubmit = async (e) => {
      e.preventDefault();
      const from_account_id = document.getElementById('transfer-from').value;
      const to_account_id = document.getElementById('transfer-to').value;
      const amount = parseFloat(document.getElementById('transfer-amount').value);
      
      if (!isNaN(amount) && from_account_id && to_account_id) {
        if (from_account_id === to_account_id) {
          alert("Cannot transfer to the same account.");
          return;
        }
        await submitTransfer({ from_account_id, to_account_id, amount });
        e.target.reset();
        transferDialog.close();
      }
    };
  }

  // Income Modal
  const incomeDialog = document.getElementById('income-dialog');
  const qaAddIncome = document.getElementById('qa-add-income');
  const addIncomeBtn = document.getElementById('add-income-btn');
  if (addIncomeBtn) addIncomeBtn.onclick = () => incomeDialog.showModal();
  if (qaAddIncome) qaAddIncome.onclick = () => incomeDialog.showModal();
  const cancelIncomeBtn = document.getElementById('cancel-income');
  if (cancelIncomeBtn) cancelIncomeBtn.onclick = () => incomeDialog.close();

  document.getElementById('income-form').onsubmit = async (e) => {
    e.preventDefault();
    const source_name = document.getElementById('income-source-name').value;
    const amount = parseFloat(document.getElementById('income-amount').value);
    const account_id = document.getElementById('income-account-id').value;
    
    if (!isNaN(amount) && source_name) {
      await addIncome({ source_name, amount, account_id: account_id || null });
      e.target.reset();
      incomeDialog.close();
    }
  };

  // Account Modal
  const accountDialog = document.getElementById('account-dialog');
  const qaAddAccount = document.getElementById('qa-add-account');
  const addAccountBtn = document.getElementById('add-account-btn');
  if (addAccountBtn) addAccountBtn.onclick = () => accountDialog.showModal();
  if (qaAddAccount) qaAddAccount.onclick = () => accountDialog.showModal();
  const cancelAccountBtn = document.getElementById('cancel-account');
  if (cancelAccountBtn) cancelAccountBtn.onclick = () => accountDialog.close();

  document.getElementById('account-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('acc-name').value;
    const type = document.getElementById('acc-type').value;
    const balance = parseFloat(document.getElementById('acc-balance').value);
    if (!isNaN(balance) && name) {
      await addAccount({ name, type, balance });
      e.target.reset();
      accountDialog.close();
    }
  };

  // Category Modal
  const categoryDialog = document.getElementById('category-dialog');
  const qaManageCats = document.getElementById('qa-manage-categories');
  if (categoryDialog) {
    if (qaManageCats) qaManageCats.onclick = () => categoryDialog.showModal();
    document.getElementById('close-category').onclick = () => categoryDialog.close();
    
    document.getElementById('category-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-category-name').value;
      const budgetInput = document.getElementById('new-category-budget');
      const budget = budgetInput ? parseFloat(budgetInput.value) : 0;
      
      if (name) {
        await addCategory(name, isNaN(budget) ? 0 : budget);
        e.target.reset();
      }
    };
  }

  // Goal Form
  const plannedDialog = document.getElementById('planned-dialog');
  const qaAddPlanned = document.getElementById('qa-add-planned');
  if (plannedDialog) {
    if (qaAddPlanned) qaAddPlanned.onclick = () => plannedDialog.showModal();
    document.getElementById('cancel-planned').onclick = () => plannedDialog.close();
  }

  const goalForm = document.getElementById('goal-form');
  if (goalForm) {
    goalForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('goal-name').value;
      const target = parseFloat(document.getElementById('goal-target').value);
      const deadline = document.getElementById('goal-deadline').value;
      
      if (!isNaN(target) && name) {
        await addGoal({ name, target_amount: target, deadline: deadline || null });
        e.target.reset();
      }
    };
  }

  // Dash Forms
  document.getElementById('expense-form').onsubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const desc = document.getElementById('description').value;
    const accId = document.getElementById('account-id').value;

    if (!isNaN(amount) && category) {
      await addTransaction({ amount, category, description: desc, account_id: accId || null });
      e.target.reset();
    }
  };

  document.getElementById('recurring-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('rec-name').value;
    const expected = parseFloat(document.getElementById('rec-amount').value);
    
    const autoPayEl = document.getElementById('rec-autopay');
    const dayEl = document.getElementById('rec-day');
    const auto_pay = autoPayEl ? autoPayEl.checked : false;
    const day_of_month = dayEl ? parseInt(dayEl.value) : 1;

    if (!isNaN(expected) && name) {
      await addRecurringExpense({ name, expected_amount: expected, category: 'planned', auto_pay, day_of_month });
      e.target.reset();
      const plannedDialog = document.getElementById('planned-dialog');
      if (plannedDialog) plannedDialog.close();
    }
  };
});
