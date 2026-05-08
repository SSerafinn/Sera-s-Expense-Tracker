import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

const JWT_SECRET = 'super_secret_key_change_in_production';

export async function getUserFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch (err) {
    return null;
  }
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET);
}
