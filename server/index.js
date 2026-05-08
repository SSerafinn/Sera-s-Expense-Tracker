import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key'; // In production, use an environment variable

// Helper to write logs
function logAction(user_id, action, message) {
  if (!user_id) return;
  db.run(`INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)`, [user_id, action, message], (err) => {
    if (err) console.error("Logging error:", err);
  });
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) return res.status(400).json({ error: "Username already exists" });
        return res.status(500).json({ error: err.message });
      }
      const userId = this.lastID;

      // Insert default categories for the new user
      const defaults = ['Housing', 'Food', 'Utilities', 'Transport', 'Entertainment', 'Other'];
      const stmt = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)');
      defaults.forEach(c => stmt.run(userId, c));
      stmt.finalize();

      logAction(userId, 'REGISTER', `User ${username} registered`);
      res.json({ success: true });
    });
  } catch (err) {
    res.status(500).json({ error: "Error hashing password" });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (await bcrypt.compare(password, user.password_hash)) {
      const accessToken = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
      logAction(user.id, 'LOGIN', `User ${username} logged in`);
      res.json({ token: accessToken });
    } else {
      res.status(401).json({ error: "Incorrect password" });
    }
  });
});

// Protect all following routes
app.use('/api', authenticateToken);

// --- Protected API Routes ---

// Logs API
app.get('/api/logs', authenticateToken, (req, res) => {
  const limit = req.query.limit || 50;
  db.all(`SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?`, [req.user.id, limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Transfers API
app.post('/api/transfer', authenticateToken, (req, res) => {
  const { from_account_id, to_account_id, amount } = req.body;
  const userId = req.user.id;
  if (!from_account_id || !to_account_id || !amount) return res.status(400).json({ error: "Missing fields" });

  db.serialize(() => {
    db.run(`BEGIN TRANSACTION`);

    db.get(`SELECT name FROM accounts WHERE id = ? AND user_id = ?`, [from_account_id, userId], (err, fromAcc) => {
      if (!fromAcc) { db.run(`ROLLBACK`); return res.status(400).json({ error: "Invalid from account" }); }
      db.get(`SELECT name FROM accounts WHERE id = ? AND user_id = ?`, [to_account_id, userId], (err, toAcc) => {
        if (!toAcc) { db.run(`ROLLBACK`); return res.status(400).json({ error: "Invalid to account" }); }

        db.run(`UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?`, [amount, from_account_id, userId], (err) => {
          if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }

          db.run(`UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?`, [amount, to_account_id, userId], (err) => {
            if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }

            db.run(`COMMIT`);
            const msg = `Transferred ₱${amount} from ${fromAcc.name} to ${toAcc.name}`;
            logAction(userId, 'TRANSFER', msg);
            res.json({ success: true, message: msg });
          });
        });
      });
    });
  });
});

// Accounts
app.get('/api/accounts', (req, res) => {
  db.all(`SELECT * FROM accounts WHERE user_id = ?`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/accounts', authenticateToken, (req, res) => {
  const { name, type, balance } = req.body;
  const userId = req.user.id;
  db.run(`INSERT INTO accounts (user_id, name, type, balance) VALUES (?, ?, ?, ?)`,
    [userId, name, type, balance], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      logAction(userId, 'CREATE_ACCOUNT', `Created ${type} account '${name}' with initial balance ₱${balance}`);
      res.json({ id: this.lastID, name, type, balance });
    });
});

app.delete('/api/accounts/:id', (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM accounts WHERE id = ? AND user_id = ?`, [req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'DELETE_ACCOUNT', `Deleted account ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Incomes
app.get('/api/incomes', authenticateToken, (req, res) => {
  const { month, year } = req.query;
  db.all(`SELECT * FROM incomes WHERE user_id = ? AND month = ? AND year = ?`, [req.user.id, month, year], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/incomes', authenticateToken, (req, res) => {
  const { source_name, amount, month, year, account_id } = req.body;
  const userId = req.user.id;

  db.serialize(() => {
    db.run(`BEGIN TRANSACTION`);
    db.run(`INSERT INTO incomes (user_id, source_name, amount, month, year, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, source_name, amount, month, year, account_id], function (err) {
        if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }

        const newIncomeId = this.lastID;
        if (account_id) {
          db.run(`UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?`, [amount, account_id, userId], (err) => {
            if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
            db.run(`COMMIT`);
            logAction(userId, 'ADD_INCOME', `Added income '${source_name}' of ₱${amount} deposited to Account ID ${account_id}`);
            res.json({ id: newIncomeId, source_name, amount, month, year, account_id });
          });
        } else {
          db.run(`COMMIT`);
          logAction(userId, 'ADD_INCOME', `Added income '${source_name}' of ₱${amount} (No Account)`);
          res.json({ id: newIncomeId, source_name, amount, month, year, account_id: null });
        }
      });
  });
});

app.delete('/api/incomes/:id', (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM incomes WHERE id = ? AND user_id = ?`, [req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'DELETE_INCOME', `Deleted income ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Recurring Expenses
app.get('/api/recurring', (req, res) => {
  db.all(`SELECT * FROM recurring_expenses WHERE user_id = ?`, [req.user.id], (err, rows) => {
    res.json(rows);
  });
});
app.post('/api/recurring', authenticateToken, (req, res) => {
  const { name, expected_amount, category, auto_pay, day_of_month } = req.body;
  const auto = auto_pay ? 1 : 0;
  const day = day_of_month || 1;
  const userId = req.user.id;
  db.run(`INSERT INTO recurring_expenses (user_id, name, expected_amount, category, auto_pay, day_of_month) VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, name, expected_amount, category, auto, day], function (err) {
      logAction(userId, 'ADD_PLANNED', `Added planned expense '${name}' for ₱${expected_amount}`);
      res.json({ id: this.lastID, name, expected_amount, category, auto_pay: auto, day_of_month: day });
    });
});
app.delete('/api/recurring/:id', (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?`, [req.params.id, userId], function (err) {
    logAction(userId, 'DELETE_PLANNED', `Deleted planned expense ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Transactions
app.get('/api/transactions', authenticateToken, (req, res) => {
  const { month, year } = req.query;
  const startDate = `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`;
  const endDate = month == 12
    ? `${parseInt(year) + 1}-01-01T00:00:00.000Z`
    : `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01T00:00:00.000Z`;

  db.all(`SELECT * FROM transactions WHERE user_id = ? AND date >= ? AND date < ?`, [req.user.id, startDate, endDate], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/transactions', authenticateToken, (req, res) => {
  const { amount, category, description, date, account_id } = req.body;
  const userId = req.user.id;

  db.serialize(() => {
    db.run(`BEGIN TRANSACTION`);
    db.run(`INSERT INTO transactions (user_id, amount, category, description, date, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, amount, category, description, date, account_id], function (err) {
        if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }

        const newTxId = this.lastID;
        if (account_id) {
          db.run(`UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?`, [amount, account_id, userId], (err) => {
            if (err) { db.run(`ROLLBACK`); return res.status(500).json({ error: err.message }); }
            db.run(`COMMIT`);
            logAction(userId, 'TRACK_EXPENSE', `Tracked ₱${amount} expense for '${description || category}' deducted from Account ID ${account_id}`);
            res.json({ id: newTxId, amount, category, description, date, account_id });
          });
        } else {
          db.run(`COMMIT`);
          logAction(userId, 'TRACK_EXPENSE', `Tracked ₱${amount} expense for '${description || category}' (No Account)`);
          res.json({ id: newTxId, amount, category, description, date, account_id: null });
        }
      });
  });
});

app.delete('/api/transactions/:id', (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'DELETE_EXPENSE', `Deleted expense ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  db.all(`SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/categories', authenticateToken, (req, res) => {
  const { name, monthly_budget } = req.body;
  const userId = req.user.id;
  if (!name) return res.status(400).json({ error: "Missing name" });
  const budget = monthly_budget || 0;
  db.run(`INSERT INTO categories (user_id, name, monthly_budget) VALUES (?, ?, ?)`, [userId, name, budget], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'ADD_CATEGORY', `Added custom category '${name}' with budget ₱${budget}`);
    res.json({ id: this.lastID, name, monthly_budget: budget });
  });
});

app.delete('/api/categories/:id', (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM categories WHERE id = ? AND user_id = ?`, [req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'DELETE_CATEGORY', `Deleted category ID: ${req.params.id}`);
    res.json({ deleted: true });
  });
});

app.put('/api/categories/:id', authenticateToken, (req, res) => {
  const { monthly_budget } = req.body;
  const userId = req.user.id;
  db.run(`UPDATE categories SET monthly_budget = ? WHERE id = ? AND user_id = ?`, [monthly_budget, req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: true });
  });
});

// Goals
app.get('/api/goals', (req, res) => {
  db.all(`SELECT * FROM goals WHERE user_id = ?`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/goals', authenticateToken, (req, res) => {
  const { name, target_amount, deadline } = req.body;
  const userId = req.user.id;
  db.run(`INSERT INTO goals (user_id, name, target_amount, deadline) VALUES (?, ?, ?, ?)`, [userId, name, target_amount, deadline], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'ADD_GOAL', `Added savings goal '${name}' for ₱${target_amount}`);
    res.json({ id: this.lastID, name, target_amount, current_amount: 0, deadline });
  });
});

app.post('/api/goals/:id/contribute', authenticateToken, (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;
  db.run(`UPDATE goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?`, [amount, req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'CONTRIBUTE_GOAL', `Contributed ₱${amount} to goal ID: ${req.params.id}`);
    res.json({ success: true });
  });
});

app.delete('/api/goals/:id', (req, res) => {
  const userId = req.user.id;
  db.run(`DELETE FROM goals WHERE id = ? AND user_id = ?`, [req.params.id, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    logAction(userId, 'DELETE_GOAL', `Deleted goal ID: ${req.params.id}`);
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
        db.run(`INSERT INTO transactions (user_id, amount, category, description, date, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
          [exp.user_id, exp.expected_amount, exp.category, `Auto-pay: ${exp.name}`, isoDate, null], function (err) {
            if (err) { db.run(`ROLLBACK`); return; }
            db.run(`UPDATE recurring_expenses SET last_processed = ? WHERE id = ?`, [currentMonthStr, exp.id], (err) => {
              if (err) { db.run(`ROLLBACK`); return; }
              db.run(`COMMIT`);
              logAction(exp.user_id, 'AUTO_PAY', `Auto-paid ₱${exp.expected_amount} for '${exp.name}'`);
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
