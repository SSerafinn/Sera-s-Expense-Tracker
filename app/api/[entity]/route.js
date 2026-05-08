import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = params.entity;
  const body = await req.json();

  return new Promise((resolve) => {
    if (entity === 'transactions') {
      const { amount, category, description, account_id } = body;
      const date = new Date().toISOString();
      db.run(`INSERT INTO transactions (user_id, amount, category, description, date, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, amount, category, description, date, account_id], function (err) {
          if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          if (account_id) {
            db.run(`UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?`, [amount, account_id, user.id]);
          }
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'EXPENSE', `Spent ${amount} on ${category}`]);
          resolve(NextResponse.json({ id: this.lastID }));
        });

    } else if (entity === 'accounts') {
      const { name, type, balance } = body;
      db.run(`INSERT INTO accounts (user_id, name, type, balance) VALUES (?, ?, ?, ?)`,
        [user.id, name, type, balance], function (err) {
          if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'ACCOUNT_CREATED', `Created ${type} account: ${name}`]);
          resolve(NextResponse.json({ id: this.lastID }));
        });

    } else if (entity === 'incomes') {
      const { source_name, amount, account_id } = body;
      const date = new Date();
      db.run(`INSERT INTO incomes (user_id, source_name, amount, month, year, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, source_name, amount, date.getMonth() + 1, date.getFullYear(), account_id], function (err) {
          if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          if (account_id) {
            db.run(`UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?`, [amount, account_id, user.id]);
          }
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'INCOME', `Received ${amount} from ${source_name}`]);
          resolve(NextResponse.json({ id: this.lastID }));
        });

    } else if (entity === 'recurring') {
      const { name, expected_amount, category, day_of_month, auto_pay } = body;
      db.run(`INSERT INTO recurring_expenses (user_id, name, expected_amount, category, day_of_month, auto_pay) VALUES (?, ?, ?, ?, ?, ?)`,
        [user.id, name, expected_amount, category, day_of_month, auto_pay ? 1 : 0], function (err) {
          if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'RECURRING_SET', `Set planned expense: ${name}`]);
          resolve(NextResponse.json({ id: this.lastID }));
        });

    } else if (entity === 'transfers') {
      const { from_account_id, to_account_id, amount } = body;
      db.run(`UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?`, [amount, from_account_id, user.id], (err) => {
        if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        db.run(`UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?`, [amount, to_account_id, user.id], function (err2) {
          if (err2) return resolve(NextResponse.json({ error: err2.message }, { status: 500 }));
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'TRANSFER', `Transferred ${amount}`]);
          resolve(NextResponse.json({ success: true }));
        });
      });

    } else if (entity === 'categories') {
      const { name, monthly_budget } = body;
      db.run(`INSERT INTO categories (user_id, name, monthly_budget) VALUES (?, ?, ?)`,
        [user.id, name, monthly_budget || 0], function (err) {
          if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'CATEGORY', `Created category: ${name}`]);
          resolve(NextResponse.json({ id: this.lastID }));
        });

    } else if (entity === 'goals') {
      const { name, target_amount, deadline } = body;
      db.run(`INSERT INTO goals (user_id, name, target_amount, deadline) VALUES (?, ?, ?, ?)`,
        [user.id, name, target_amount, deadline], function (err) {
          if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'GOAL', `Created goal: ${name}`]);
          resolve(NextResponse.json({ id: this.lastID }));
        });

    } else {
      resolve(NextResponse.json({ error: "Unknown entity" }, { status: 404 }));
    }
  });
}
