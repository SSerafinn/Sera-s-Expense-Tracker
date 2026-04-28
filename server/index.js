import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// Helper to write logs
function logAction(action, message) {
  db.run(`INSERT INTO audit_logs (action, message) VALUES (?, ?)`, [action, message], (err) => {
    if(err) console.error("Logging error:", err);
  });
}

// Logs API
app.get('/api/logs', (req, res) => {
  const limit = req.query.limit || 50;
  db.all(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Transfers API
app.post('/api/transfer', (req, res) => {
  const { from_account_id, to_account_id, amount } = req.body;
  if (!from_account_id || !to_account_id || !amount) return res.status(400).json({ error: "Missing fields" });

  db.serialize(() => {
    db.run(`BEGIN TRANSACTION`);
    
    db.get(`SELECT name FROM accounts WHERE id = ?`, [from_account_id], (err, fromAcc) => {
      db.get(`SELECT name FROM accounts WHERE id = ?`, [to_account_id], (err, toAcc) => {
        
        db.run(`UPDATE accounts SET balance = balance - ? WHERE id = ?`, [amount, from_account_id], (err) => {
          if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
          
          db.run(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [amount, to_account_id], (err) => {
            if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
            
            db.run(`COMMIT`);
            const msg = `Transferred ₱${amount} from ${fromAcc ? fromAcc.name : 'Unknown'} to ${toAcc ? toAcc.name : 'Unknown'}`;
            logAction('TRANSFER', msg);
            res.json({ success: true, message: msg });
          });
        });

      });
    });
  });
});

// Accounts
app.get('/api/accounts', (req, res) => {
  db.all(`SELECT * FROM accounts`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/accounts', (req, res) => {
  const { name, type, balance } = req.body;
  db.run(`INSERT INTO accounts (name, type, balance) VALUES (?, ?, ?)`,
    [name, type, balance], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('CREATE_ACCOUNT', `Created ${type} account '${name}' with initial balance ₱${balance}`);
    res.json({ id: this.lastID, name, type, balance });
  });
});

app.delete('/api/accounts/:id', (req, res) => {
  db.run(`DELETE FROM accounts WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('DELETE_ACCOUNT', `Deleted account ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Incomes
app.get('/api/incomes', (req, res) => {
  const { month, year } = req.query;
  db.all(`SELECT * FROM incomes WHERE month = ? AND year = ?`, [month, year], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/incomes', (req, res) => {
  const { source_name, amount, month, year, account_id } = req.body;
  
  db.serialize(() => {
    db.run(`BEGIN TRANSACTION`);
    db.run(`INSERT INTO incomes (source_name, amount, month, year, account_id) VALUES (?, ?, ?, ?, ?)`, 
      [source_name, amount, month, year, account_id], function(err) {
      if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
      
      const newIncomeId = this.lastID;
      if (account_id) {
        db.run(`UPDATE accounts SET balance = balance + ? WHERE id = ?`, [amount, account_id], (err) => {
          if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
          db.run(`COMMIT`);
          logAction('ADD_INCOME', `Added income '${source_name}' of ₱${amount} deposited to Account ID ${account_id}`);
          res.json({ id: newIncomeId, source_name, amount, month, year, account_id });
        });
      } else {
        db.run(`COMMIT`);
        logAction('ADD_INCOME', `Added income '${source_name}' of ₱${amount} (No Account)`);
        res.json({ id: newIncomeId, source_name, amount, month, year, account_id: null });
      }
    });
  });
});

app.delete('/api/incomes/:id', (req, res) => {
  db.run(`DELETE FROM incomes WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('DELETE_INCOME', `Deleted income ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Recurring Expenses
app.get('/api/recurring', (req, res) => {
  db.all(`SELECT * FROM recurring_expenses`, [], (err, rows) => {
    res.json(rows);
  });
});
app.post('/api/recurring', (req, res) => {
  const { name, expected_amount, category, auto_pay, day_of_month } = req.body;
  const auto = auto_pay ? 1 : 0;
  const day = day_of_month || 1;
  db.run(`INSERT INTO recurring_expenses (name, expected_amount, category, auto_pay, day_of_month) VALUES (?, ?, ?, ?, ?)`,
    [name, expected_amount, category, auto, day], function(err) {
    logAction('ADD_PLANNED', `Added planned expense '${name}' for ₱${expected_amount}`);
    res.json({ id: this.lastID, name, expected_amount, category, auto_pay: auto, day_of_month: day });
  });
});
app.delete('/api/recurring/:id', (req, res) => {
  db.run(`DELETE FROM recurring_expenses WHERE id = ?`, [req.params.id], function(err) {
    logAction('DELETE_PLANNED', `Deleted planned expense ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Transactions
app.get('/api/transactions', (req, res) => {
  const { month, year } = req.query;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const endDate = month == 12 
    ? `${parseInt(year)+1}-01-01T00:00:00.000Z`
    : `${year}-${String(parseInt(month)+1).padStart(2, '0')}-01T00:00:00.000Z`;
    
  db.all(`SELECT * FROM transactions WHERE date >= ? AND date < ?`, [startDate, endDate], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/transactions', (req, res) => {
  const { amount, category, description, date, account_id } = req.body;
  
  db.serialize(() => {
    db.run(`BEGIN TRANSACTION`);
    db.run(`INSERT INTO transactions (amount, category, description, date, account_id) VALUES (?, ?, ?, ?, ?)`,
      [amount, category, description, date, account_id], function(err) {
      if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
      
      const newTxId = this.lastID;
      if (account_id) {
        db.run(`UPDATE accounts SET balance = balance - ? WHERE id = ?`, [amount, account_id], (err) => {
          if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
          db.run(`COMMIT`);
          logAction('TRACK_EXPENSE', `Tracked ₱${amount} expense for '${description || category}' deducted from Account ID ${account_id}`);
          res.json({ id: newTxId, amount, category, description, date, account_id });
        });
      } else {
        db.run(`COMMIT`);
        logAction('TRACK_EXPENSE', `Tracked ₱${amount} expense for '${description || category}' (No Account)`);
        res.json({ id: newTxId, amount, category, description, date, account_id: null });
      }
    });
  });
});

app.delete('/api/transactions/:id', (req, res) => {
  db.run(`DELETE FROM transactions WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('DELETE_EXPENSE', `Deleted expense ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  db.all(`SELECT * FROM categories ORDER BY name ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', (req, res) => {
  const { name, monthly_budget } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });
  const budget = monthly_budget || 0;
  db.run(`INSERT INTO categories (name, monthly_budget) VALUES (?, ?)`, [name, budget], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('ADD_CATEGORY', `Added custom category '${name}' with budget ₱${budget}`);
    res.json({ id: this.lastID, name, monthly_budget: budget });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  db.run(`DELETE FROM categories WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('DELETE_CATEGORY', `Deleted category ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

app.put('/api/categories/:id', (req, res) => {
  const { monthly_budget } = req.body;
  db.run(`UPDATE categories SET monthly_budget = ? WHERE id = ?`, [monthly_budget, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: true });
  });
});

// Goals
app.get('/api/goals', (req, res) => {
  db.all(`SELECT * FROM goals`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/goals', (req, res) => {
  const { name, target_amount, deadline } = req.body;
  db.run(`INSERT INTO goals (name, target_amount, deadline) VALUES (?, ?, ?)`, [name, target_amount, deadline], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('ADD_GOAL', `Added savings goal '${name}' for ₱${target_amount}`);
    res.json({ id: this.lastID, name, target_amount, current_amount: 0, deadline });
  });
});

app.post('/api/goals/:id/contribute', (req, res) => {
  const { amount } = req.body;
  db.run(`UPDATE goals SET current_amount = current_amount + ? WHERE id = ?`, [amount, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('CONTRIBUTE_GOAL', `Contributed ₱${amount} to goal ID: ${req.params.id}`);
    res.json({ success: true });
  });
});

app.delete('/api/goals/:id', (req, res) => {
  db.run(`DELETE FROM goals WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction('DELETE_GOAL', `Deleted goal ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Automation Worker
function processAutoPayments() {
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isoDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0).toISOString();
  const currentDay = today.getDate();

  db.all(`SELECT * FROM recurring_expenses WHERE auto_pay = 1 AND day_of_month <= ? AND last_processed != ?`, [currentDay, currentMonthStr], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(exp => {
      db.serialize(() => {
        db.run(`BEGIN TRANSACTION`);
        db.run(`INSERT INTO transactions (amount, category, description, date, account_id) VALUES (?, ?, ?, ?, ?)`,
          [exp.expected_amount, exp.category, `Auto-pay: ${exp.name}`, isoDate, null], function(err) {
          if (err) { db.run(`ROLLBACK`); return; }
          db.run(`UPDATE recurring_expenses SET last_processed = ? WHERE id = ?`, [currentMonthStr, exp.id], (err) => {
            if (err) { db.run(`ROLLBACK`); return; }
            db.run(`COMMIT`);
            logAction('AUTO_PAY', `Auto-paid ₱${exp.expected_amount} for '${exp.name}'`);
          });
        });
      });
    });
  });
}

processAutoPayments();
setInterval(processAutoPayments, 60 * 60 * 1000);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
