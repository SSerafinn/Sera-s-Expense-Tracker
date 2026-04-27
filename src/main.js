import './style.css';
import { state, subscribe, fetchState, addIncome, addRecurringExpense, addTransaction, addAccount, submitTransfer, setDate, setTab, setLogsLimit } from './state.js';
import { renderDashboard } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  subscribe(renderDashboard);
  await fetchState();

  // Navigation
  document.getElementById('tab-dashboard').onclick = () => setTab('dashboard');
  document.getElementById('tab-insights').onclick = () => setTab('insights');
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

  // Transfer Modal
  const transferDialog = document.getElementById('transfer-dialog');
  const transferBtn = document.getElementById('transfer-btn');
  if (transferBtn && transferDialog) {
    transferBtn.onclick = () => transferDialog.showModal();
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
  document.getElementById('add-income-btn').onclick = () => incomeDialog.showModal();
  document.getElementById('cancel-income').onclick = () => incomeDialog.close();

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
  document.getElementById('add-account-btn').onclick = () => accountDialog.showModal();
  document.getElementById('cancel-account').onclick = () => accountDialog.close();

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
    if (!isNaN(expected) && name) {
      await addRecurringExpense({ name, expected_amount: expected, category: 'planned' });
      e.target.reset();
    }
  };
});
