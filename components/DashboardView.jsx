"use client";
import { useStateContext } from './StateContext';
import Modals from './Modals';

export default function DashboardView() {
  const { state, authFetch, fetchState, Toast } = useStateContext();

  const formatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

  // Calculations
  const assetTotal = state.accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
  const liabilityTotal = state.accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + a.balance, 0);
  const plannedTotal = state.recurringExpenses.reduce((sum, r) => sum + r.expected_amount, 0);
  const safeToSpend = (assetTotal - liabilityTotal) - plannedTotal;
  
  const totalIncome = state.incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = state.transactions.reduce((sum, t) => sum + t.amount, 0);

  const deleteItem = async (entity, id) => {
    try {
      const res = await authFetch(`/api/${entity}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        Toast.fire({ icon: 'success', title: 'Deleted successfully' });
        fetchState();
      }
    } catch (e) {}
  };

  return (
    <main className="view">
      <section className="stats-row">
        <div className="stat-card balance">
          <p className="stat-label">Safe to Spend</p>
          <h2 className="stat-value">{formatter.format(safeToSpend)}</h2>
          <p className="stat-sublabel">Net Worth - Planned Expenses</p>
        </div>
        <div className="stat-card minimal">
          <p className="stat-label">Total Income</p>
          <h3 className="stat-value highlight">{formatter.format(totalIncome)}</h3>
        </div>
        <div className="stat-card minimal">
          <p className="stat-label">Total Actual Spent</p>
          <h3 className="stat-value danger">{formatter.format(totalExpenses)}</h3>
        </div>
      </section>

      <Modals />

      <div className="dashboard-grid-main">
        <div className="grid-col main-col">
          <div className="card glass">
            <h3>Track Expense</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const amt = parseFloat(e.target.amount.value);
              const cat = e.target.category.value;
              const desc = e.target.description.value;
              const accId = e.target.accountId.value;
              if (!isNaN(amt) && cat) {
                try {
                  const res = await authFetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: amt, category: cat, description: desc, account_id: accId || null })
                  });
                  if (res.ok) {
                    e.target.reset();
                    Toast.fire({ icon: 'success', title: 'Expense tracked!' });
                    fetchState();
                  }
                } catch(err) {}
              }
            }}>
              <div className="form-group">
                <label>Amount</label>
                <input type="number" name="amount" placeholder="0.00" step="0.01" required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" required defaultValue="">
                  <option value="" disabled>Select category</option>
                  {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Deduct From Account</label>
                <select name="accountId">
                  <option value="">(None)</option>
                  {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatter.format(a.balance)})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input type="text" name="description" placeholder="What was this for?" />
              </div>
              <button type="submit" className="primary-btn">Add Expense</button>
            </form>
          </div>

          <div className="card glass mt-1 feed-card">
            <h3>Recent Transactions</h3>
            <div className="transactions-list">
              {state.transactions.length === 0 ? (
                 <div style={{ padding: '2rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', marginTop: '1rem' }}>
                   <p style={{ color: 'var(--color-text-main)', fontWeight: 500, marginBottom: '0.5rem' }}>No transactions found</p>
                   <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Start by adding an account, then track an expense!</p>
                 </div>
              ) : (
                state.transactions.map(t => (
                  <div key={t.id} className="transaction-item">
                    <div style={{ flexGrow: 1 }}>
                      <strong>{t.description || t.category}</strong>
                      <div className="transaction-meta">
                        <span>{new Date(t.date).toLocaleDateString()}</span>
                        <span className="tag">{t.category}</span>
                      </div>
                    </div>
                    <div className="transaction-amount">
                      <span style={{ color: 'var(--color-danger)' }}>-{formatter.format(t.amount)}</span>
                      <button className="transaction-del" onClick={() => deleteItem('transactions', t.id)}>×</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid-col side-col">
          <div className="card blank">
            <h3>Accounts Ledger</h3>
            <div className="mini-list">
              {state.accounts.length === 0 ? (
                <div style={{ padding: '1rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No accounts yet. Click &quot;Add Account&quot; above.</p>
                </div>
              ) : (
                state.accounts.map(acc => (
                  <div key={acc.id} className="mini-item">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{acc.name}</span>
                      <small style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{acc.type === 'asset' ? 'Asset' : 'Liability'}</small>
                    </div>
                    <span>
                      <strong style={{ color: acc.type === 'asset' ? 'var(--color-accent)' : 'var(--color-danger)' }}>
                        {formatter.format(acc.balance)}
                      </strong>
                      <button className="mini-item-delete" onClick={() => deleteItem('accounts', acc.id)}>×</button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card blank mt-1">
            <h3>Income Sources</h3>
            <div className="mini-list">
              {state.incomes.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No income sources found.</p>
              ) : (
                state.incomes.map(inc => (
                  <div key={inc.id} className="mini-item">
                    <span>{inc.source_name}</span>
                    <span>{formatter.format(inc.amount)} <button className="mini-item-delete" onClick={() => deleteItem('incomes', inc.id)}>×</button></span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card blank mt-1">
            <h3>Planned Expenses</h3>
            <div className="mini-list">
              {state.recurringExpenses.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>No planned expenses set.</p>
              ) : (
                state.recurringExpenses.map(rec => (
                  <div key={rec.id} className="mini-item">
                    <span>{rec.name}</span>
                    <span>{formatter.format(rec.expected_amount)} <button className="mini-item-delete" onClick={() => deleteItem('recurring', rec.id)}>×</button></span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
