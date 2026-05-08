import db from '@/lib/db';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);
    
    return new Promise((resolve) => {
      db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hashedPassword], function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return resolve(NextResponse.json({ error: "Username already exists" }, { status: 400 }));
          }
          return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        }
        const userId = this.lastID;

        // Insert default categories
        const defaults = ['Housing', 'Food', 'Utilities', 'Transport', 'Entertainment', 'Other'];
        const stmt = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)');
        defaults.forEach(c => stmt.run(userId, c));
        stmt.finalize();

        db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [userId, 'REGISTER', `User ${username} registered`]);
        
        resolve(NextResponse.json({ success: true }));
      });
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
