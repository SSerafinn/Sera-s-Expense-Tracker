import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlite3Verbose = sqlite3.verbose();

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3Verbose.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'asset' or 'liability'
      balance REAL NOT NULL DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_name TEXT NOT NULL,
      amount REAL NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      account_id INTEGER,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      expected_amount REAL NOT NULL,
      category TEXT NOT NULL,
      auto_pay INTEGER DEFAULT 0,
      day_of_month INTEGER DEFAULT 1,
      last_processed TEXT DEFAULT ''
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      account_id INTEGER,
      FOREIGN KEY(account_id) REFERENCES accounts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      monthly_budget REAL DEFAULT 0
    )
  `, () => {
    db.get('SELECT COUNT(*) as count FROM categories', (err, row) => {
      if (!err && row.count === 0) {
        const defaults = ['Housing', 'Food', 'Utilities', 'Transport', 'Entertainment', 'Other'];
        const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
        defaults.forEach(c => stmt.run(c));
        stmt.finalize();
      }
    });
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT
    )
  `);

  // Schema migrations for existing databases
  db.run("ALTER TABLE categories ADD COLUMN monthly_budget REAL DEFAULT 0", () => {});
  db.run("ALTER TABLE recurring_expenses ADD COLUMN auto_pay INTEGER DEFAULT 0", () => {});
  db.run("ALTER TABLE recurring_expenses ADD COLUMN day_of_month INTEGER DEFAULT 1", () => {});
  db.run("ALTER TABLE recurring_expenses ADD COLUMN last_processed TEXT DEFAULT ''", () => {});
});

export default db;
