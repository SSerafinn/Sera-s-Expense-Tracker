"use client";
import { useState, useRef, useEffect } from 'react';
import { useStateContext } from './StateContext';

export default function Modals() {
  const { authFetch, fetchState, Toast, state } = useStateContext();
  
  // Income State
  const [incSource, setIncSource] = useState('');
  const [incAmount, setIncAmount] = useState('');
  const [incAccount, setIncAccount] = useState('');

  // Account State
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('asset');
  const [accBalance, setAccBalance] = useState('');

  // Category State
  const [catName, setCatName] = useState('');
  const [catBudget, setCatBudget] = useState('');

  // Planned State
  const [recName, setRecName] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recAuto, setRecAuto] = useState(false);
  const [recDay, setRecDay] = useState(1);

  const handleSubmit = async (e, entity, body, resetFn) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/api/${entity}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        Toast.fire({ icon: 'success', title: 'Saved successfully' });
        resetFn();
        fetchState();
      } else {
        const err = await res.json();
        Toast.fire({ icon: 'error', title: err.error });
      }
    } catch (e) {
      Toast.fire({ icon: 'error', title: 'Network error' });
    }
  };

  return (
    <>
      <section className="quick-actions-row">
        <button className="qa-btn" onClick={() => document.getElementById('account-dialog').showModal()}>🏦 Add Account</button>
        <button className="qa-btn" onClick={() => {
          if (state.accounts.length === 0) return Toast.fire({ icon: 'warning', title: 'Please add an account first.' });
          document.getElementById('income-dialog').showModal();
        }}>💵 Add Income</button>
        <button className="qa-btn" onClick={() => document.getElementById('category-dialog').showModal()}>🏷️ Categories</button>
        <button className="qa-btn" onClick={() => document.getElementById('planned-dialog').showModal()}>📅 Add Planned</button>
      </section>

      {/* Modals */}
      <dialog id="income-dialog">
        <form method="dialog" onSubmit={(e) => handleSubmit(e, 'incomes', { source_name: incSource, amount: parseFloat(incAmount), account_id: incAccount }, () => { setIncSource(''); setIncAmount(''); document.getElementById('income-dialog').close(); })}>
          <h3>Add Income Source</h3>
          <div className="form-group">
            <label>Source Name</label>
            <input type="text" value={incSource} onChange={e => setIncSource(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" step="0.01" value={incAmount} onChange={e => setIncAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Deposit To Account</label>
            <select value={incAccount} onChange={e => setIncAccount(e.target.value)}>
              <option value="">(None)</option>
              {state.accounts.filter(a => a.type === 'asset').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="dialog-actions">
            <button type="button" className="text-button" onClick={() => document.getElementById('income-dialog').close()}>Cancel</button>
            <button type="submit" className="primary-btn">Save</button>
          </div>
        </form>
      </dialog>

      <dialog id="account-dialog">
        <form method="dialog" onSubmit={(e) => handleSubmit(e, 'accounts', { name: accName, type: accType, balance: parseFloat(accBalance) }, () => { setAccName(''); setAccBalance(''); document.getElementById('account-dialog').close(); })}>
          <h3>Add Account</h3>
          <div className="form-group">
            <label>Account Name</label>
            <input type="text" value={accName} onChange={e => setAccName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={accType} onChange={e => setAccType(e.target.value)} required>
              <option value="asset">Asset (Checking, Savings)</option>
              <option value="liability">Liability (Credit Card, Loan)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Current Balance</label>
            <input type="number" step="0.01" value={accBalance} onChange={e => setAccBalance(e.target.value)} required />
          </div>
          <div className="dialog-actions">
            <button type="button" className="text-button" onClick={() => document.getElementById('account-dialog').close()}>Cancel</button>
            <button type="submit" className="primary-btn">Save Account</button>
          </div>
        </form>
      </dialog>

      <dialog id="category-dialog">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-bg)', paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ border: 'none', padding: 0, margin: 0 }}>Manage Categories</h3>
          <button type="button" className="text-button" onClick={() => document.getElementById('category-dialog').close()} style={{ position: 'static' }}>Close</button>
        </div>
        <form style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }} onSubmit={(e) => handleSubmit(e, 'categories', { name: catName, monthly_budget: parseFloat(catBudget) || 0 }, () => { setCatName(''); setCatBudget(''); })}>
          <input type="text" placeholder="New Category" value={catName} onChange={e => setCatName(e.target.value)} required style={{ flex: 1, minWidth: '140px' }} />
          <input type="number" placeholder="Budget (0)" step="0.01" value={catBudget} onChange={e => setCatBudget(e.target.value)} style={{ width: '90px' }} />
          <button type="submit" className="primary-btn" style={{ width: 'auto', padding: '0.6rem 1rem' }}>Add</button>
        </form>
        <div className="mini-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {state.categories.map(c => (
             <div key={c.id} className="mini-item">
               <span>{c.name}</span>
               <span>{c.monthly_budget}</span>
             </div>
          ))}
        </div>
      </dialog>

      <dialog id="planned-dialog">
        <form method="dialog" onSubmit={(e) => handleSubmit(e, 'recurring', { name: recName, expected_amount: parseFloat(recAmount), category: 'Housing', day_of_month: parseInt(recDay), auto_pay: recAuto }, () => { setRecName(''); setRecAmount(''); document.getElementById('planned-dialog').close(); })}>
          <h3>Add Planned Expense</h3>
          <div className="form-group">
            <label>Bill Name</label>
            <input type="text" value={recName} onChange={e => setRecName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Expected Amount</label>
            <input type="number" step="0.01" value={recAmount} onChange={e => setRecAmount(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              <input type="checkbox" checked={recAuto} onChange={e => setRecAuto(e.target.checked)} style={{ width: 'auto', padding: 0, margin: 0 }} /> Auto-pay
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              Day: <input type="number" min="1" max="31" value={recDay} onChange={e => setRecDay(e.target.value)} style={{ width: '60px', padding: '0.2rem 0.5rem' }} />
            </label>
          </div>
          <div className="dialog-actions">
            <button type="button" className="text-button" onClick={() => document.getElementById('planned-dialog').close()}>Cancel</button>
            <button type="submit" className="primary-btn">Save</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
