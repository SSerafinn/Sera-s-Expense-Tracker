import db from '@/lib/db';
import bcrypt from 'bcrypt';
import { signToken } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    
    return new Promise((resolve) => {
      db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (err) return resolve(NextResponse.json({ error: err.message }, { status: 500 }));
        if (!user) return resolve(NextResponse.json({ error: "User not found" }, { status: 400 }));

        if (await bcrypt.compare(password, user.password_hash)) {
          const accessToken = signToken({ id: user.id, username: user.username });
          db.run('INSERT INTO audit_logs (user_id, action, message) VALUES (?, ?, ?)', [user.id, 'LOGIN', `User ${user.username} logged in`]);
          resolve(NextResponse.json({ token: accessToken }));
        } else {
          resolve(NextResponse.json({ error: "Incorrect password" }, { status: 401 }));
        }
      });
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
