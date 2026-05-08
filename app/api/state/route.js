import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return new Promise((resolve) => {
    const state = {
      transactions: [],
      accounts: [],
      incomes: [],
      recurringExpenses: [],
      auditLogs: [],
      categories: [],
      goals: []
    };

    let queriesCompleted = 0;
    const totalQueries = 7;
    const checkDone = () => {
      queriesCompleted++;
      if (queriesCompleted === totalQueries) {
        resolve(NextResponse.json(state));
      }
    };

    db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC', [user.id], (err, rows) => {
      if (!err) state.transactions = rows;
      checkDone();
    });
    db.all('SELECT * FROM accounts WHERE user_id = ?', [user.id], (err, rows) => {
      if (!err) state.accounts = rows;
      checkDone();
    });
    db.all('SELECT * FROM incomes WHERE user_id = ? ORDER BY year DESC, month DESC', [user.id], (err, rows) => {
      if (!err) state.incomes = rows;
      checkDone();
    });
    db.all('SELECT * FROM recurring_expenses WHERE user_id = ?', [user.id], (err, rows) => {
      if (!err) state.recurringExpenses = rows;
      checkDone();
    });
    db.all('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50', [user.id], (err, rows) => {
      if (!err) state.auditLogs = rows;
      checkDone();
    });
    db.all('SELECT * FROM categories WHERE user_id = ?', [user.id], (err, rows) => {
      if (!err) state.categories = rows;
      checkDone();
    });
    db.all('SELECT * FROM goals WHERE user_id = ?', [user.id], (err, rows) => {
      if (!err) state.goals = rows;
      checkDone();
    });
  });
}
