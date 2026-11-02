import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, hashPassword } from './db';

export interface AuthenticatedUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Middleware verificare sesiune activă
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Neautorizat: Sesiune lipsă sau expirată.' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    const session = db.prepare(`
      SELECT s.token, s.expires_at, u.id, u.email, u.full_name, u.role, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token) as any;

    if (!session) {
      return res.status(401).json({ error: 'Neautorizat: Sesiune invalidă.' });
    }

    if (new Date(session.expires_at) < new Date()) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return res.status(401).json({ error: 'Sesiunea a expirat. Vă rugăm să vă autentificați din nou.' });
    }

    if (!session.is_active) {
      return res.status(403).json({ error: 'Contul de utilizator este inactiv.' });
    }

    req.user = {
      id: session.id,
      email: session.email,
      full_name: session.full_name,
      role: session.role,
      is_active: session.is_active,
    };

    next();
  } catch (err: any) {
    console.error('Eroare autentificare sesiune:', err);
    return res.status(500).json({ error: 'Eroare internă de autentificare.' });
  }
}

/**
 * Autentificare utilizator
 */
export function login(email: string, password: string): { token: string; user: AuthenticatedUser } | null {
  const user = db.prepare(`
    SELECT id, email, password_hash, full_name, role, is_active
    FROM users
    WHERE email = ?
  `).get(email.trim().toLowerCase()) as any;

  if (!user) return null;
  if (!user.is_active) return null;

  const inputHash = hashPassword(password);
  if (user.password_hash !== inputHash) return null;

  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 zile

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, user.id, now.toISOString(), expiresAt);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    },
  };
}

/**
 * Înregistrare utilizator nou
 */
export function register(email: string, password: string, fullName: string): { token: string; user: AuthenticatedUser } {
  const cleanEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    throw new Error('Un cont cu această adresă de email există deja.');
  }

  const now = new Date().toISOString();
  const pwdHash = hashPassword(password);

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 'ACCOUNTANT', 1, ?, ?)
  `).run(cleanEmail, pwdHash, fullName.trim(), now, now);

  const newUserId = Number(result.lastInsertRowid);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, newUserId, now, expiresAt);

  return {
    token,
    user: {
      id: newUserId,
      email: cleanEmail,
      full_name: fullName.trim(),
      role: 'ACCOUNTANT',
      is_active: 1,
    },
  };
}

/**
 * Deconectare utilizator
 */
export function logout(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}
