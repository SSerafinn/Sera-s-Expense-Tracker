import sqlite3 from 'sqlite3';

// Use a new database file to cleanly wipe the old one
const db = new sqlite3.Database('./server/app.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the new SQLite database (app.sqlite).');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
<<<<<<< HEAD
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
=======
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'asset' or 'liability'
      balance REAL NOT NULL DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      source_name TEXT NOT NULL,
      amount REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      account_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      expected_amount REAL NOT NULL,
      category TEXT NOT NULL,
      auto_pay INTEGER DEFAULT 0,
      day_of_month INTEGER DEFAULT 1,
      last_processed TEXT DEFAULT '',
      FOREIGN KEY(user_id) REFERENCES users(id)
>>>>>>> e9c8a1ca6dcd9c6629e9682add6b75d3b5518714
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      account_id INTEGER,
<<<<<<< HEAD
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      balance REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      expected_amount REAL NOT NULL,
      category TEXT NOT NULL,
      auto_pay INTEGER DEFAULT 0,
      day_of_month INTEGER DEFAULT 1,
      last_processed TEXT DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users (id)
=======
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(account_id) REFERENCES accounts(id)
>>>>>>> e9c8a1ca6dcd9c6629e9682add6b75d3b5518714
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
<<<<<<< HEAD
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
=======
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
>>>>>>> e9c8a1ca6dcd9c6629e9682add6b75d3b5518714
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      monthly_budget REAL DEFAULT 0,
<<<<<<< HEAD
      FOREIGN KEY (user_id) REFERENCES users (id)
=======
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(user_id, name)
>>>>>>> e9c8a1ca6dcd9c6629e9682add6b75d3b5518714
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT,
<<<<<<< HEAD
      FOREIGN KEY (user_id) REFERENCES users (id)
=======
      FOREIGN KEY(user_id) REFERENCES users(id)
>>>>>>> e9c8a1ca6dcd9c6629e9682add6b75d3b5518714
    )
  `);
});

export default db;
