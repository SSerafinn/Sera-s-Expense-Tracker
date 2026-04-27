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
  const { name, expected_amount, category } = req.body;
  db.run(`INSERT INTO recurring_expenses (name, expected_amount, category) VALUES (?, ?, ?)`,
    [name, expected_amount, category], function(err) {
    logAction('ADD_PLANNED', `Added planned expense '${name}' for ₱${expected_amount}`);
    res.json({ id: this.lastID, name, expected_amount, category });
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

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
