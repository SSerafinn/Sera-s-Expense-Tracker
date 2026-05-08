import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function DELETE(req, { params }) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entity = params.entity;
  const id = params.id;

  return new Promise((resolve) => {
    let tableName = '';
    if (entity === 'transactions') tableName = 'transactions';
    else if (entity === 'accounts') tableName = 'accounts';
    else if (entity === 'incomes') tableName = 'incomes';
    else if (entity === 'recurring') tableName = 'recurring_expenses';
    else if (entity === 'goals') tableName = 'goals';
    else return resolve(NextResponse.json({ error: "Unknown entity" }, { status: 404 }));

    db.run(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`, [id, user.id], function (err) {
      if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
      db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'DELETE', `Deleted from ${tableName}`]);
      resolve(NextResponse.json({ success: true }));
    });
  });
}
